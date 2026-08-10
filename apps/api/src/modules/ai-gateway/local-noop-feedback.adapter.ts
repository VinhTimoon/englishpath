import {
  AI_FEEDBACK_PROMPT_VERSION,
  type AiFeedbackAdapter,
  type FeedbackRequest,
  type FeedbackAdapterResult,
} from './ai-feedback.models';

export class LocalNoopFeedbackAdapter implements AiFeedbackAdapter {
  generate(input: FeedbackRequest): Promise<FeedbackAdapterResult> {
    if (input.promptVersion !== AI_FEEDBACK_PROMPT_VERSION) {
      return Promise.resolve({
        outcome: 'PROVIDER_UNAVAILABLE',
        feedback: null,
      });
    }
    const skillLabel = input.skill === 'SPEAKING' ? 'speaking' : 'writing';
    return Promise.resolve({
      outcome: 'ALLOWED',
      feedback: {
        advisoryOnly: true,
        summary: `This local practice check suggests continuing your ${skillLabel} routine.`,
        strengths: ['You completed a bounded practice response.'],
        nextSteps: [
          input.skill === 'SPEAKING'
            ? 'Repeat the response slowly and focus on clear pronunciation.'
            : 'Review the response for complete sentences and precise word choice.',
        ],
      },
    });
  }
}
