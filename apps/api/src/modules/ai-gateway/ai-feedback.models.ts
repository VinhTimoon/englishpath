export const AI_FEEDBACK_USAGE_REPOSITORY = Symbol(
  'AI_FEEDBACK_USAGE_REPOSITORY',
);
export const AI_FEEDBACK_ADAPTER = Symbol('AI_FEEDBACK_ADAPTER');

export const AI_FEEDBACK_FEATURES = ['SPEAKING', 'WRITING'] as const;
export type AiFeedbackFeature = (typeof AI_FEEDBACK_FEATURES)[number];
export const AI_FEEDBACK_SKILLS = ['SPEAKING', 'WRITING'] as const;
export type AiFeedbackSkill = (typeof AI_FEEDBACK_SKILLS)[number];
export const AI_FEEDBACK_OUTCOMES = [
  'ALLOWED',
  'DENIED',
  'PROVIDER_UNAVAILABLE',
] as const;
export type AiFeedbackOutcome = (typeof AI_FEEDBACK_OUTCOMES)[number];

export const AI_FEEDBACK_POLICY_VERSION = 'feedback-gateway-v1';
export const AI_FEEDBACK_PROMPT_VERSION = 'local-fixture-v1';
export const AI_FEEDBACK_ADAPTER_KIND = 'LOCAL_NOOP';
export const AI_FEEDBACK_MODEL_VERSION = 'local-noop-v1';
export const AI_FEEDBACK_DAILY_QUOTA = 10;

export type FeedbackRequest = Readonly<{
  feature: AiFeedbackFeature;
  skill: AiFeedbackSkill;
  promptVersion: string;
  taskId: string;
  inputText: string;
}>;

export type AdvisoryFeedback = Readonly<{
  advisoryOnly: true;
  summary: string;
  strengths: readonly string[];
  nextSteps: readonly string[];
}>;

export type FeedbackAdapterResult = Readonly<{
  outcome: 'ALLOWED' | 'PROVIDER_UNAVAILABLE';
  feedback: AdvisoryFeedback | null;
}>;

export interface AiFeedbackAdapter {
  generate(input: FeedbackRequest): Promise<FeedbackAdapterResult>;
}

export type FeedbackUsageRecord = Readonly<{
  id: string;
  userId: string;
  feature: AiFeedbackFeature;
  skill: AiFeedbackSkill;
  policyVersion: string;
  promptVersion: string;
  adapterKind: string;
  modelVersion: string;
  idempotencyKey: string;
  requestFingerprint: string;
  outcome: AiFeedbackOutcome;
  estimatedCostMicros: number;
  quotaRemaining: number;
  feedback: AdvisoryFeedback | null;
  correlationId: string;
  createdAt: Date;
}>;

export type FeedbackUsageCreate = Omit<FeedbackUsageRecord, 'id' | 'createdAt'>;

export interface AiFeedbackUsageRepository {
  findByIdempotency(
    userId: string,
    idempotencyKey: string,
  ): Promise<FeedbackUsageRecord | null>;
  countSince(userId: string, since: Date): Promise<number>;
  create(input: FeedbackUsageCreate): Promise<FeedbackUsageRecord>;
}

export type SafeFeedbackResponse = Readonly<{
  outcome: AiFeedbackOutcome;
  policyVersion: string;
  promptVersion: string;
  feature: AiFeedbackFeature;
  skill: AiFeedbackSkill;
  quotaRemaining: number;
  feedback: AdvisoryFeedback | null;
}>;
