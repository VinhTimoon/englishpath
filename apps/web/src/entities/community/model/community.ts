import { z } from "zod";

const safeId = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const isoDate = z.string().datetime({ offset: true });
const correlationId = z.string().min(1).max(128);
const pagination = z
  .object({
    limit: z.number().int().min(0).max(100),
    offset: z.number().int().min(0).max(100_000),
    total: z.number().int().nonnegative(),
    hasNext: z.boolean(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      value.offset > value.total ||
      value.hasNext !== value.offset + value.limit < value.total
    ) {
      context.addIssue({ code: "custom", message: "Invalid pagination" });
    }
  });
const listMeta = z
  .object({
    correlationId,
    idempotencyStatus: z.literal("not_applicable"),
    pagination,
  })
  .strict();
const mutationMeta = z
  .object({ correlationId, idempotencyStatus: z.enum(["created", "replayed"]) })
  .strict();

export const reportReasons = [
  "SPAM",
  "HARASSMENT",
  "HARMFUL_CONTENT",
  "COPYRIGHT",
  "OTHER",
] as const;
export const moderationDecisions = ["PUBLISH", "REJECT", "ARCHIVE"] as const;
export type ReportReason = (typeof reportReasons)[number];
export type ModerationDecision = (typeof moderationDecisions)[number];

const post = z
  .object({
    id: safeId,
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(5000),
    createdAt: isoDate,
    publishedAt: isoDate,
  })
  .strict();
const queuePost = z
  .object({
    id: safeId,
    title: z.string().min(1).max(120),
    body: z.string().min(1).max(5000),
    status: z.enum(["PENDING_REVIEW", "FLAGGED"]),
    createdAt: isoDate,
    reportCount: z.number().int().nonnegative(),
    reasons: z.array(z.enum(reportReasons)).max(reportReasons.length),
  })
  .strict();

export const postsEnvelopeSchema = z
  .object({ data: z.array(post).max(100), meta: listMeta })
  .strict()
  .superRefine((value, context) => {
    if (value.data.length > value.meta.pagination.limit) {
      context.addIssue({ code: "custom", message: "Invalid page size" });
    }
  });
export const queueEnvelopeSchema = z
  .object({ data: z.array(queuePost).max(100), meta: listMeta })
  .strict()
  .superRefine((value, context) => {
    if (value.data.length > value.meta.pagination.limit) {
      context.addIssue({ code: "custom", message: "Invalid page size" });
    }
  });
export const createPostEnvelopeSchema = z
  .object({
    data: z
      .object({
        id: safeId,
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(5000),
        status: z.literal("PENDING_REVIEW"),
        createdAt: isoDate,
      })
      .strict(),
    meta: mutationMeta,
  })
  .strict();
export const reportEnvelopeSchema = z
  .object({
    data: z.object({ reported: z.literal(true) }).strict(),
    meta: mutationMeta,
  })
  .strict();
export const decisionEnvelopeSchema = z
  .object({
    data: z
      .object({
        id: safeId,
        status: z.enum(["PUBLISHED", "REJECTED", "ARCHIVED"]),
      })
      .strict(),
    meta: mutationMeta,
  })
  .strict();

export const postDraftSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Nhập tiêu đề.")
    .max(120, "Tiêu đề tối đa 120 ký tự."),
  body: z
    .string()
    .trim()
    .min(1, "Nhập nội dung.")
    .max(5000, "Nội dung tối đa 5.000 ký tự."),
});
export type PostDraft = z.infer<typeof postDraftSchema>;
export type PostsEnvelope = z.infer<typeof postsEnvelopeSchema>;
export type QueueEnvelope = z.infer<typeof queueEnvelopeSchema>;
export type MutationResult = { kind: "created" | "replayed" };
