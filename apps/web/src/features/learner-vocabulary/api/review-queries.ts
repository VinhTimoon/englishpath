import { mutationOptions, queryOptions } from "@tanstack/react-query";
import {
  dueReviewsEnvelopeSchema,
  reviewEnvelopeSchema,
  type DueReview,
  type ReviewOutcome,
} from "@/entities/vocabulary/model/vocabulary";
import { requestLearnerApi } from "@/shared/api/learner-api-client";

export const dueReviewsQuery = (enabled = true) =>
  queryOptions<{ data: DueReview[] }>({
    queryKey: ["learner-vocabulary", "due-reviews"],
    queryFn: async () =>
      requestLearnerApi("/vocabulary/reviews/due?limit=20").then((value) => {
        const parsed = dueReviewsEnvelopeSchema.parse(value);
        return parsed;
      }),
    retry: false,
    enabled,
  });

export const reviewMutation = () =>
  mutationOptions<
    { data: ReviewOutcome },
    Error,
    { vocabularyId: string; quality: number; clientSubmissionId: string }
  >({
    mutationFn: async (input) => {
      const value = await requestLearnerApi(
        `/vocabulary/reviews/${encodeURIComponent(input.vocabularyId)}`,
        { method: "POST", body: input },
      );
      return reviewEnvelopeSchema.parse(value);
    },
  });
