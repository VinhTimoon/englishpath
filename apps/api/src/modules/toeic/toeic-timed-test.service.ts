import { Inject, Injectable, Optional } from '@nestjs/common';
import type { ApplicationPrincipal } from '../access';
import {
  TOEIC_ERROR_NOTEBOOK_CAPTURE,
  type ErrorNotebookCaptureHandler,
} from '../practice/practice.models';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import type {
  TimedPrivateQuestion,
  TimedQuestion,
  TimedSession,
  TimedTestClock,
  ToeicTimedTestRepository,
} from './toeic-timed-test.models';
import {
  TOEIC_TIMED_TEST_CLOCK,
  TOEIC_TIMED_TEST_REPOSITORY,
} from './toeic-timed-test.models';
import {
  timedTestPolicy,
  timedTestPolicyVersion,
  type TimedTestMode,
} from './toeic-timed-test.policy';
import { assembleFullMockTest } from './full-mock-test/full-mock-test.assembler';
import { buildTimedTestAnalysis } from './toeic-timed-test.analysis';
import type { RemediationPack } from './toeic-timed-test.analysis';
import { VocabularyService } from '../vocabulary/vocabulary.service';
import { ToeicPracticeCatalogueService } from './toeic-practice-catalogue.service';
import type { ToeicPart } from '../../generated/prisma/enums';

type Option = Readonly<{ id: string; text: string }>;

const MAX_REMEDIATION_PACKS = 6;
const GRAMMAR_GUIDES: Readonly<
  Partial<Record<'PART_5' | 'PART_6', { slug: string; title: string }>>
> = {
  PART_5: {
    slug: 'present-perfect-have-has',
    title: 'Ngữ pháp TOEIC Part 5',
  },
  PART_6: {
    slug: 'cach-dung-do-va-make',
    title: 'Ngữ pháp trong ngữ cảnh Part 6',
  },
};

function partNumber(part: ToeicPart): number {
  return Number(part.slice('PART_'.length));
}

function partSkill(part: ToeicPart): 'listening' | 'reading' {
  return partNumber(part) <= 4 ? 'listening' : 'reading';
}

function isUniqueConstraint(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

function parseOptions(value: unknown): readonly Option[] {
  if (!Array.isArray(value) || value.length < 2 || value.length > 6) {
    throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
  }
  const options: Option[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }
    const record = item as { id?: unknown; text?: unknown };
    if (
      typeof record.id !== 'string' ||
      !/^[A-F]$/.test(record.id) ||
      typeof record.text !== 'string' ||
      !record.text.trim() ||
      seen.has(record.id)
    ) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
    }
    seen.add(record.id);
    options.push({ id: record.id, text: record.text.trim() });
  }
  return options;
}

function safeQuestion(question: TimedQuestion) {
  return {
    id: question.id,
    questionId: question.questionId,
    prompt: question.prompt,
    options: parseOptions(question.options),
    part: question.part,
    questionType: question.questionType,
    difficulty: question.difficulty,
    topic: question.topic,
    stimulusGroup: question.stimulusGroup,
    mediaReference: question.mediaReference,
    explanation: question.explanation,
  };
}

function safeSession(
  session: TimedSession,
  clock: TimedTestClock,
  questions: readonly ReturnType<typeof safeQuestion>[] = [],
) {
  return {
    sessionId: session.id,
    mode: session.mode,
    status: session.status,
    total: session.total,
    answered: session.answers.length,
    startedAt: session.startedAt,
    deadlineAt: session.deadlineAt,
    remainingSeconds: Math.max(
      0,
      Math.ceil((session.deadlineAt.getTime() - clock().getTime()) / 1000),
    ),
    ...(session.status === 'SUBMITTED' || session.status === 'EXPIRED'
      ? { score: session.score }
      : {}),
    ...(questions.length > 0 ? { questions } : {}),
  };
}

function asMode(value: string): TimedTestMode {
  if (value === 'MINI' || value === 'HALF' || value === 'FULL') return value;
  throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
}

@Injectable()
export class ToeicTimedTestService {
  constructor(
    @Inject(TOEIC_TIMED_TEST_REPOSITORY)
    private readonly repository: ToeicTimedTestRepository,
    @Inject(TOEIC_TIMED_TEST_CLOCK)
    private readonly clock: TimedTestClock,
    @Inject(TOEIC_ERROR_NOTEBOOK_CAPTURE)
    @Optional()
    private readonly captureErrors: ErrorNotebookCaptureHandler = () =>
      Promise.resolve(0),
    @Optional() private readonly vocabulary?: VocabularyService,
    @Optional() private readonly catalogue?: ToeicPracticeCatalogueService,
  ) {}

  async start(
    principal: ApplicationPrincipal,
    input: Readonly<{ clientSessionId: string; mode: string }>,
  ) {
    const mode = asMode(input.mode);
    try {
      const existing = await this.repository.findByClient(
        principal.applicationUserId,
        input.clientSessionId,
      );
      if (existing) {
        if (existing.mode !== mode) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
        }
        const questions = await this.safeQuestions(existing);
        return {
          session: safeSession(existing, this.clock, questions),
          questions,
          replayed: true,
        };
      }

      const policy = timedTestPolicy(mode);
      const startedAt = this.clock();
      const eligible = await this.repository.eligibleQuestions(startedAt);
      let selected: TimedPrivateQuestion[];
      if (mode === 'FULL') {
        const assembly = assembleFullMockTest(
          eligible.map((question) => ({
            canonicalQuestionId: question.questionId,
            versionId: question.id,
            version: question.version ?? 1,
            part: question.part,
          })),
        );
        if (
          !assembly.ok ||
          assembly.assembly.selectedVersionIds.length !== policy.total
        ) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
        }
        const byId = new Map(
          eligible.map((question) => [question.id, question]),
        );
        selected = assembly.assembly.selectedVersionIds
          .map((id) => byId.get(id))
          .filter((question): question is TimedPrivateQuestion =>
            Boolean(question),
          );
        if (selected.length !== policy.total) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
        }
      } else {
        const byPart = new Map<string, TimedPrivateQuestion[]>();
        for (const question of eligible) {
          const bucket = byPart.get(question.part) ?? [];
          bucket.push(question);
          byPart.set(question.part, bucket);
        }
        selected = [];
        for (const [part, count] of Object.entries(policy.quotas)) {
          const bucket = byPart.get(part) ?? [];
          if (bucket.length < count)
            throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
          selected.push(...bucket.slice(0, count));
        }
      }

      const created = await this.repository.create({
        userId: principal.applicationUserId,
        clientSessionId: input.clientSessionId,
        mode,
        policyVersion: timedTestPolicyVersion(mode),
        questionIds: selected.map((question) => question.id),
        startedAt,
        deadlineAt: new Date(
          startedAt.getTime() + policy.durationSeconds * 1000,
        ),
        total: policy.total,
      });
      const questions = selected.map(safeQuestion);
      return {
        session: safeSession(created, this.clock, questions),
        questions,
        replayed: false,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      if (isUniqueConstraint(error)) {
        const replay = await this.repository.findByClient(
          principal.applicationUserId,
          input.clientSessionId,
        );
        if (replay?.mode === mode) {
          const questions = await this.safeQuestions(replay);
          return {
            session: safeSession(replay, this.clock, questions),
            questions,
            replayed: true,
          };
        }
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async get(principal: ApplicationPrincipal, sessionId: string) {
    const session = await this.resolveSession(principal, sessionId);
    if (session.status !== 'ACTIVE') {
      await this.captureFinalizedErrors(principal.applicationUserId, session);
    }
    const questions =
      session.status === 'ACTIVE' ? await this.safeQuestions(session) : [];
    return { session: safeSession(session, this.clock, questions), questions };
  }

  async answer(
    principal: ApplicationPrincipal,
    sessionId: string,
    input: Readonly<{ questionId: string; selectedOption: string }>,
  ) {
    try {
      const session = await this.repository.find(
        sessionId,
        principal.applicationUserId,
      );
      if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      const now = this.clock();
      if (session.status !== 'ACTIVE' || now >= session.deadlineAt) {
        if (session.status === 'ACTIVE')
          await this.repository.finalize(
            sessionId,
            principal.applicationUserId,
            now,
          );
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      if (!session.questionIds.includes(input.questionId)) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      }
      // Validate the persisted question snapshot and its option set before
      // handling retries. This keeps malformed/retired snapshot rows closed
      // even when an answer request is repeated.
      const question = (
        await this.repository.privateQuestionsByIds([input.questionId], now)
      )[0];
      if (!question) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      const options = parseOptions(question.options);
      if (!options.some((option) => option.id === input.selectedOption)) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
      }
      const prior = session.answers.find(
        (answer) => answer.questionId === input.questionId,
      );
      if (prior) {
        if (prior.selectedOption !== input.selectedOption) {
          throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
        }
        return {
          accepted: true,
          replayed: true,
          questionId: input.questionId,
          answered: session.answers.length,
          total: session.total,
        };
      }

      const result = await this.repository.createAnswer({
        sessionId,
        questionId: input.questionId,
        selectedOption: input.selectedOption,
        isCorrect: question.correctAnswer === input.selectedOption,
        answeredAt: now,
      });
      if (result === 'closed') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      if (result === 'conflict') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      }
      const current = await this.repository.find(
        sessionId,
        principal.applicationUserId,
      );
      if (!current) {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
      }
      return {
        accepted: true,
        replayed: result === 'replayed',
        questionId: input.questionId,
        answered: current.answers.length,
        total: current.total,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async submit(principal: ApplicationPrincipal, sessionId: string) {
    try {
      const result = await this.repository.finalize(
        sessionId,
        principal.applicationUserId,
        this.clock(),
      );
      if (result.state === 'missing') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
      }
      if (result.state === 'incomplete') {
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.INCOMPLETE);
      }
      if (result.session.status !== 'ACTIVE') {
        await this.captureFinalizedErrors(
          principal.applicationUserId,
          result.session,
        );
      }
      return { session: safeSession(result.session, this.clock) };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async result(principal: ApplicationPrincipal, sessionId: string) {
    try {
      const session = await this.resolveSession(principal, sessionId);
      const questions =
        session.status === 'ACTIVE' ? await this.safeQuestions(session) : [];
      if (session.status !== 'ACTIVE') {
        await this.captureFinalizedErrors(principal.applicationUserId, session);
      }
      return {
        session: safeSession(session, this.clock, questions),
        questions,
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  async analysis(principal: ApplicationPrincipal, sessionId: string) {
    try {
      const session = await this.resolveSession(principal, sessionId);
      if (session.status === 'ACTIVE')
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.CONFLICT);
      const questions = await this.repository.finalizedQuestionsByIds(
        session.questionIds,
      );
      if (questions.length !== session.questionIds.length)
        throw new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
      const remediation = await this.captureFinalizedErrors(
        principal.applicationUserId,
        session,
        questions,
      );
      const analysis = buildTimedTestAnalysis(session, questions);
      let packs: readonly RemediationPack[] = [];
      try {
        packs = await this.buildPacks(analysis);
      } catch {
        // Remediation is an additive projection; content failures must never
        // hide a valid finalized score or analysis.
        packs = [];
      }
      return {
        analysis,
        remediation: { ...remediation, packs },
      };
    } catch (error) {
      if (error instanceof ToeicQuestionError) throw error;
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.REPOSITORY_FAILURE);
    }
  }

  private async buildPacks(
    analysis: ReturnType<typeof buildTimedTestAnalysis>,
  ): Promise<readonly RemediationPack[]> {
    const weakPartNames = new Set(
      analysis.weaknesses
        .filter(
          (item) => item.scope === 'part' && /^Part [1-7]$/u.test(item.name),
        )
        .map((item) => `PART_${item.name.slice('Part '.length)}` as ToeicPart),
    );
    const weakSkills = new Set(
      analysis.weaknesses
        .filter((item) => item.scope === 'skill')
        .map((item) => item.name),
    );
    const candidateParts = analysis.parts
      .filter(
        (part) =>
          part.answered > 0 &&
          (weakPartNames.has(part.part) ||
            weakSkills.has(partSkill(part.part).toUpperCase())),
      )
      .sort(
        (left, right) =>
          left.accuracy - right.accuracy ||
          partNumber(left.part) - partNumber(right.part),
      )
      .map((part) => part.part);

    if (candidateParts.length === 0) return [];

    let catalogue: Awaited<
      ReturnType<ToeicPracticeCatalogueService['getCatalogue']>
    > | null = null;
    if (this.catalogue) {
      try {
        catalogue = await this.catalogue.getCatalogue();
      } catch {
        catalogue = null;
      }
    }

    const packs: RemediationPack[] = [];
    const seen = new Set<string>();
    const add = (pack: RemediationPack) => {
      if (packs.length < MAX_REMEDIATION_PACKS && !seen.has(pack.href)) {
        seen.add(pack.href);
        packs.push(pack);
      }
    };

    for (const part of candidateParts) {
      const number = partNumber(part);
      const skill = partSkill(part);
      if (this.vocabulary) {
        try {
          const topics = await this.vocabulary.listTopics({
            page: 1,
            size: 1,
            level: 'toeic-core',
            track: 'toeic-listening-reading',
            skill,
            toeicPart: number,
          });
          if (topics.data.length > 0) {
            add({
              kind: 'VOCABULARY',
              title: `Từ vựng TOEIC Part ${number}`,
              description:
                'Ôn các chủ đề từ vựng đã được duyệt cho phần bạn cần củng cố.',
              href: `/vocabulary?level=toeic-core&track=toeic-listening-reading&skill=${skill}&toeicPart=${number}`,
              relatedLabel: `Part ${number}`,
            });
          }
        } catch {
          // A content lookup failure must not hide the finalized analysis.
        }
      }

      const guide =
        part === 'PART_5'
          ? GRAMMAR_GUIDES.PART_5
          : part === 'PART_6'
            ? GRAMMAR_GUIDES.PART_6
            : undefined;
      if (guide) {
        add({
          kind: 'GRAMMAR',
          title: guide.title,
          description: 'Đọc hướng dẫn ngữ pháp đã được biên tập và duyệt.',
          href: `/blog/${guide.slug}`,
          relatedLabel: `Part ${number}`,
        });
      }

      const available =
        number <= 4 ? catalogue?.listening.parts : catalogue?.reading.parts;
      if (available?.includes(part)) {
        add({
          kind: 'PRACTICE',
          title: `Luyện tập TOEIC Part ${number}`,
          description:
            'Mở bài luyện tập với bộ lọc Part đã được catalogue xác nhận.',
          href: `/toeic/practice?mode=${number <= 4 ? 'listening' : 'reading'}&part=${part}`,
          relatedLabel: `Part ${number}`,
        });
      }
    }
    return packs;
  }

  private async resolveSession(
    principal: ApplicationPrincipal,
    sessionId: string,
  ): Promise<TimedSession> {
    const session = await this.repository.find(
      sessionId,
      principal.applicationUserId,
    );
    if (!session) throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    if (session.status !== 'ACTIVE' || this.clock() < session.deadlineAt) {
      return session;
    }
    const finalized = await this.repository.finalize(
      sessionId,
      principal.applicationUserId,
      this.clock(),
    );
    if (finalized.state === 'missing') {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    }
    return finalized.session;
  }

  private async safeQuestions(session: TimedSession) {
    const questions = await this.repository.safeQuestionsByIds(
      session.questionIds,
      this.clock(),
    );
    if (questions.length !== session.questionIds.length) {
      throw new ToeicQuestionError(TOEIC_ERROR_CODES.NOT_FOUND);
    }
    const byId = new Map(questions.map((question) => [question.id, question]));
    return session.questionIds.map((id) => safeQuestion(byId.get(id)!));
  }

  private async captureFinalizedErrors(
    userId: string,
    session: TimedSession,
    knownQuestions?: readonly TimedPrivateQuestion[],
  ) {
    try {
      const questions =
        knownQuestions ??
        (await this.repository.finalizedQuestionsByIds(session.questionIds));
      if (questions.length !== session.questionIds.length) {
        return { status: 'unavailable' as const, count: 0, href: null };
      }
      const count = await this.captureErrors({
        userId,
        sessionId: session.id,
        answers: session.answers.map((answer) => ({
          questionId: answer.questionId,
          selectedOption: answer.selectedOption,
          isCorrect: answer.isCorrect,
        })),
        questions: questions.map((question) => ({
          questionId: question.id,
          prompt: question.prompt,
          correctOption: question.correctAnswer,
          explanation: question.explanation ?? '',
        })),
      });
      return count > 0
        ? {
            status: 'ready' as const,
            count,
            href: '/error-notebook?source=TOEIC_TIMED_TEST',
          }
        : { status: 'empty' as const, count: 0, href: null };
    } catch {
      return { status: 'unavailable' as const, count: 0, href: null };
    }
  }
}
