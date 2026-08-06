import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import {
  TOEIC_TIMED_TEST_POLICY_VERSION,
  timedTestPolicy,
  type TimedTestMode,
} from './toeic-timed-test.policy';
import {
  TOEIC_TIMED_TEST_REPOSITORY,
  type ToeicTimedTestRepository,
  type TimedSession,
} from './toeic-timed-test.models';
import { Inject } from '@nestjs/common';
@Injectable()
export class ToeicTimedTestService {
  constructor(
    @Inject(TOEIC_TIMED_TEST_REPOSITORY)
    private readonly repo: ToeicTimedTestRepository,
    private readonly clock: () => Date = () => new Date(),
  ) {}
  private safe(s: TimedSession, questions: any[] = []) {
    return {
      id: s.id,
      mode: s.mode,
      status: s.status,
      total: s.total,
      answered: s.answers.length,
      startedAt: s.startedAt,
      deadlineAt: s.deadlineAt,
      remainingSeconds: Math.max(
        0,
        Math.ceil((s.deadlineAt.getTime() - this.clock().getTime()) / 1000),
      ),
      questions,
    };
  }
  async start(
    p: ApplicationPrincipal,
    input: { clientSessionId: string; mode: TimedTestMode },
  ) {
    const old = await this.repo.findByClient(
      p.applicationUserId,
      input.clientSessionId,
    );
    if (old) {
      if (old.mode !== input.mode) throw new ConflictException();
      return { ...this.safe(old), replayed: true };
    }
    const policy = timedTestPolicy(input.mode),
      now = this.clock(),
      eligible = await this.repo.eligibleQuestions(now);
    const byPart: any = {};
    for (const q of eligible) {
      (byPart[q.part] ??= []).push(q);
    }
    const selected: any[] = [];
    for (const part of Object.keys(policy.quotas)) {
      if ((byPart[part]?.length ?? 0) < (policy.quotas as any)[part])
        throw new NotFoundException();
      selected.push(...byPart[part].slice(0, (policy.quotas as any)[part]));
    }
    const s = await this.repo.create({
      userId: p.applicationUserId,
      clientSessionId: input.clientSessionId,
      mode: input.mode,
      policyVersion: TOEIC_TIMED_TEST_POLICY_VERSION,
      questionIds: selected.map((q) => q.id),
      startedAt: now,
      deadlineAt: new Date(now.getTime() + policy.durationSeconds * 1000),
      total: policy.total,
    });
    return {
      ...this.safe(
        s,
        selected.map(({ correctAnswer, ...q }) => q),
      ),
      replayed: false,
    };
  }
  async get(p: ApplicationPrincipal, id: string) {
    const s = await this.repo.find(id, p.applicationUserId);
    if (!s) throw new NotFoundException();
    return this.safe(s);
  }
  async answer(
    p: ApplicationPrincipal,
    id: string,
    input: { questionId: string; selectedOption: string },
  ) {
    const s = await this.repo.find(id, p.applicationUserId);
    if (!s) throw new NotFoundException();
    if (s.status !== 'ACTIVE' || this.clock() >= s.deadlineAt)
      throw new ConflictException();
    if (!s.questionIds.includes(input.questionId))
      throw new NotFoundException();
    const q = (await this.repo.eligibleQuestions(this.clock())).find(
      (x) => x.id === input.questionId,
    );
    if (!q) throw new NotFoundException();
    const opts = Array.isArray(q.options)
      ? q.options.map((x: any) => (typeof x === 'string' ? x : x.id))
      : [];
    if (!opts.includes(input.selectedOption))
      throw new UnprocessableEntityException();
    const result = await this.repo.answer(
      id,
      input.questionId,
      input.selectedOption,
      q.correctAnswer === input.selectedOption,
      this.clock(),
    );
    if (result === 'conflict') throw new ConflictException();
    return { questionId: input.questionId, replayed: result === 'replayed' };
  }
  async submit(p: ApplicationPrincipal, id: string) {
    const s = await this.repo.find(id, p.applicationUserId);
    if (!s) throw new NotFoundException();
    if (s.status !== 'ACTIVE') return this.safe(s);
    if (this.clock() < s.deadlineAt && s.answers.length < s.total)
      throw new UnprocessableEntityException();
    const score = s.answers.filter((a) => a.isCorrect).length;
    await this.repo.finalize(
      id,
      p.applicationUserId,
      this.clock() >= s.deadlineAt ? 'EXPIRED' : 'SUBMITTED',
      score,
      this.clock(),
    );
    const done = await this.repo.find(id, p.applicationUserId);
    return this.safe(done!);
  }
  result(p: ApplicationPrincipal, id: string) {
    return this.submit(p, id).catch((e) => {
      if (e instanceof UnprocessableEntityException) return this.get(p, id);
      throw e;
    });
  }
}
