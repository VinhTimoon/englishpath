import type { ToeicPart } from '../../generated/prisma/enums';
import type {
  TimedPrivateQuestion,
  TimedSession,
} from './toeic-timed-test.models';
import { TOEIC_ERROR_CODES, ToeicQuestionError } from './toeic-question.error';
import {
  timedTestPolicy,
  timedTestPolicyVersion,
} from './toeic-timed-test.policy';

export type TimedTestAnalysis = Readonly<{
  score: Readonly<{ correct: number; total: number; answered: number }>;
  accuracy: number;
  skills: readonly TimedAnalysisAggregate[];
  parts: readonly (TimedAnalysisAggregate & { part: ToeicPart })[];
  weaknesses: readonly TimedWeakness[];
  time: Readonly<{
    limitSeconds: number;
    usedSeconds: number;
    remainingSeconds: number;
    averageSecondsPerAnswered: number;
  }>;
}>;

export type RemediationPack = Readonly<{
  kind: 'VOCABULARY' | 'GRAMMAR' | 'PRACTICE';
  title: string;
  description: string;
  href: string;
  relatedLabel?: string;
}>;

export type TimedAnalysisAggregate = Readonly<{
  skill?: 'LISTENING' | 'READING';
  total: number;
  answered: number;
  correct: number;
  accuracy: number;
}>;

export type TimedWeakness = Readonly<{
  scope: 'part' | 'skill';
  name: string;
  accuracy: number;
  answered: number;
}>;

const PART_ORDER = [
  'PART_1',
  'PART_2',
  'PART_3',
  'PART_4',
  'PART_5',
  'PART_6',
  'PART_7',
] as const satisfies readonly ToeicPart[];

const LISTENING_PARTS = new Set<ToeicPart>([
  'PART_1',
  'PART_2',
  'PART_3',
  'PART_4',
]);

function roundPercent(correct: number, answered: number): number {
  if (answered === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((correct * 100) / answered)));
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function partSkill(part: ToeicPart): 'LISTENING' | 'READING' {
  return LISTENING_PARTS.has(part) ? 'LISTENING' : 'READING';
}

function aggregate(
  questions: readonly TimedPrivateQuestion[],
  answers: ReadonlyMap<string, { isCorrect: boolean }>,
): Omit<TimedAnalysisAggregate, 'skill'> {
  const answered = questions.filter((question) => answers.has(question.id));
  const correct = answered.filter(
    (question) => answers.get(question.id)?.isCorrect === true,
  ).length;
  return {
    total: questions.length,
    answered: answered.length,
    correct,
    accuracy: roundPercent(correct, answered.length),
  };
}

export function buildTimedTestAnalysis(
  session: TimedSession,
  questions: readonly TimedPrivateQuestion[],
): TimedTestAnalysis {
  const invalidSnapshot = () =>
    new ToeicQuestionError(TOEIC_ERROR_CODES.INVALID_CONTENT);
  if (
    session.mode !== 'MINI' &&
    session.mode !== 'HALF' &&
    session.mode !== 'FULL'
  ) {
    throw invalidSnapshot();
  }
  const policy = timedTestPolicy(session.mode);
  const hasExpectedPartQuotas = PART_ORDER.every(
    (part) =>
      questions.filter((question) => question.part === part).length ===
      policy.quotas[part],
  );
  if (
    (session.status !== 'SUBMITTED' && session.status !== 'EXPIRED') ||
    !session.finalizedAt ||
    session.policyVersion !== timedTestPolicyVersion(session.mode) ||
    session.total !== policy.total ||
    session.total !== session.questionIds.length ||
    questions.length !== policy.total ||
    new Set(session.questionIds).size !== session.questionIds.length ||
    !hasExpectedPartQuotas ||
    !Number.isFinite(session.startedAt.getTime()) ||
    !Number.isFinite(session.finalizedAt.getTime()) ||
    session.finalizedAt.getTime() < session.startedAt.getTime()
  ) {
    throw invalidSnapshot();
  }

  const questionIds = new Set(session.questionIds);
  const byId = new Map(questions.map((question) => [question.id, question]));
  if (
    byId.size !== questions.length ||
    questions.some((question) => !questionIds.has(question.id)) ||
    session.questionIds.some((id) => !byId.has(id))
  ) {
    throw invalidSnapshot();
  }

  const answers = new Map(
    session.answers.map((answer) => [answer.questionId, answer]),
  );
  if (
    answers.size !== session.answers.length ||
    session.answers.length > policy.total ||
    session.answers.some(
      (answer) =>
        !questionIds.has(answer.questionId) ||
        typeof answer.isCorrect !== 'boolean',
    )
  ) {
    throw invalidSnapshot();
  }

  const orderedQuestions = session.questionIds.map((id) => byId.get(id)!);
  const parts = PART_ORDER.map((part) => {
    const value = aggregate(
      orderedQuestions.filter((question) => question.part === part),
      answers,
    );
    return { part, ...value };
  });

  const skills = (['LISTENING', 'READING'] as const).map((skill) => ({
    skill,
    ...aggregate(
      orderedQuestions.filter((question) => partSkill(question.part) === skill),
      answers,
    ),
  }));

  const score = {
    correct: [...answers.values()].filter((answer) => answer.isCorrect).length,
    total: policy.total,
    answered: answers.size,
  };
  const usedSeconds = Math.max(
    0,
    Math.min(
      policy.durationSeconds,
      Math.floor(
        (session.finalizedAt.getTime() - session.startedAt.getTime()) / 1000,
      ),
    ),
  );

  const ranked = [
    ...parts.map((part, index) => ({
      scope: 'part' as const,
      name: `Part ${index + 1}`,
      accuracy: part.accuracy,
      answered: part.answered,
      order: index,
    })),
    ...skills.map((skill, index) => ({
      scope: 'skill' as const,
      name: skill.skill,
      accuracy: skill.accuracy,
      answered: skill.answered,
      order: 100 + index,
    })),
  ]
    .filter((item) => item.answered > 0)
    .sort(
      (left, right) =>
        left.accuracy - right.accuracy || left.order - right.order,
    )
    .slice(0, 3)
    .map(({ scope, name, accuracy, answered }) => ({
      scope,
      name,
      accuracy,
      answered,
    }));

  return {
    score,
    accuracy: roundPercent(score.correct, score.answered),
    parts,
    skills,
    weaknesses: ranked,
    time: {
      limitSeconds: policy.durationSeconds,
      usedSeconds,
      remainingSeconds: policy.durationSeconds - usedSeconds,
      averageSecondsPerAnswered:
        score.answered > 0 ? roundTenth(usedSeconds / score.answered) : 0,
    },
  };
}
