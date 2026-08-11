import type { AdvisoryFeedback, AiFeedbackOutcome } from './ai-feedback.models';

export const AI_EXPLANATION_SOURCES = ['PRACTICE', 'TOEIC_TIMED_TEST'] as const;
export type AiExplanationSource = (typeof AI_EXPLANATION_SOURCES)[number];

export const AI_EXPLANATION_POLICY_VERSION = 'explanation-gateway-v1';
export const AI_EXPLANATION_PROMPT_VERSION = 'grounded-notebook-v1';
export const AI_EXPLANATION_ADAPTER_KIND = 'GROUNDED_NOTEBOOK';
export const AI_EXPLANATION_MODEL_VERSION = 'none';
export const AI_EXPLANATION_FEATURE = 'EXPLANATION' as const;
export const AI_EXPLANATION_SKILL = 'EXPLANATION' as const;

export type SafeExplanationResponse = Readonly<{
  outcome: AiFeedbackOutcome;
  policyVersion: typeof AI_EXPLANATION_POLICY_VERSION;
  promptVersion: typeof AI_EXPLANATION_PROMPT_VERSION;
  source: AiExplanationSource;
  quotaRemaining: number;
  feedback: AdvisoryFeedback | null;
}>;
