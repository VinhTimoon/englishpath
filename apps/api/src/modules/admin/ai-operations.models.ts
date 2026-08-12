export const AI_OPERATIONS_WINDOW_HOURS = 24 as const;
export const AI_OPERATIONS_FEATURES = [
  'SPEAKING',
  'WRITING',
  'EXPLANATION',
] as const;
export const AI_OPERATIONS_SKILLS = [
  'SPEAKING',
  'WRITING',
  'EXPLANATION',
] as const;

export type AiOperationsFeature = (typeof AI_OPERATIONS_FEATURES)[number];
export type AiOperationsSkill = (typeof AI_OPERATIONS_SKILLS)[number];
export type AiOperationsRole = 'CONTENT_EDITOR' | 'ADMIN' | 'SUPER_ADMIN';

export type AiOperationsGroup = Readonly<{
  key: string;
  count: number;
}>;

export type AiOperationsEvidence = Readonly<{
  totalRequests: number;
  outcomes: readonly AiOperationsGroup[];
  features: readonly AiOperationsGroup[];
  skills: readonly AiOperationsGroup[];
  estimatedCostMicros: number;
}>;

export type AiOperationsProjection = Readonly<{
  role: AiOperationsRole;
  window: Readonly<{
    start: string;
    end: string;
    hours: typeof AI_OPERATIONS_WINDOW_HOURS;
  }>;
  totals: Readonly<{
    requests: number;
    allowed: number;
    denied: number;
    unavailable: number;
    quotaDenials: number;
    estimatedCostMicros: number;
  }>;
  featureSummary: readonly AiOperationsGroup[];
  skillSummary: readonly AiOperationsGroup[];
  replayed: Readonly<{ state: 'unavailable' }>;
  abuse: Readonly<{ state: 'unavailable' }>;
}>;
