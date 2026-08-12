import { mutationOptions, queryOptions } from "@tanstack/react-query";
import {
  createPostEnvelopeSchema,
  decisionEnvelopeSchema,
  postsEnvelopeSchema,
  queueEnvelopeSchema,
  reportEnvelopeSchema,
  type ModerationDecision,
  type PostDraft,
  type ReportReason,
} from "@/entities/community/model/community";
import { requestLearnerApi } from "@/shared/api/learner-api-client";

const pagePath = (path: string, limit: number, offset: number) =>
  `${path}?limit=${limit}&offset=${offset}`;
export const communityPostsQuery = (limit: number, offset: number) =>
  queryOptions({
    queryKey: ["community", "posts", limit, offset],
    queryFn: async ({ signal }) =>
      postsEnvelopeSchema.parse(
        await requestLearnerApi<unknown>(
          pagePath("/community/posts", limit, offset),
          { signal },
        ),
      ),
    retry: false,
  });
export const moderationQueueQuery = (limit: number, offset: number) =>
  queryOptions({
    queryKey: ["community", "moderation", limit, offset],
    queryFn: async ({ signal }) =>
      queueEnvelopeSchema.parse(
        await requestLearnerApi<unknown>(
          pagePath("/community/moderation/queue", limit, offset),
          { signal },
        ),
      ),
    retry: false,
  });
export const createPostMutation = () =>
  mutationOptions({
    mutationFn: async ({ draft, key }: { draft: PostDraft; key: string }) =>
      createPostEnvelopeSchema.parse(
        await requestLearnerApi<unknown>("/community/posts", {
          method: "POST",
          body: draft,
          idempotencyKey: key,
        }),
      ),
  });
export const reportPostMutation = () =>
  mutationOptions({
    mutationFn: async ({
      postId,
      reason,
      key,
    }: {
      postId: string;
      reason: ReportReason;
      key: string;
    }) =>
      reportEnvelopeSchema.parse(
        await requestLearnerApi<unknown>(
          `/community/posts/${encodeURIComponent(postId)}/reports`,
          { method: "POST", body: { reason }, idempotencyKey: key },
        ),
      ),
  });
export const decidePostMutation = () =>
  mutationOptions({
    mutationFn: async ({
      postId,
      decision,
      key,
    }: {
      postId: string;
      decision: ModerationDecision;
      key: string;
    }) =>
      decisionEnvelopeSchema.parse(
        await requestLearnerApi<unknown>(
          `/community/moderation/${encodeURIComponent(postId)}/decision`,
          { method: "POST", body: { decision }, idempotencyKey: key },
        ),
      ),
  });
