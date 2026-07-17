import { z } from "zod";

export const vocabularyLevels = [
  ["daily-basic", "Daily Basic", "Từ nền tảng cho sinh hoạt hằng ngày."],
  [
    "common-communication",
    "Common Communication",
    "Giao tiếp quen thuộc và phản xạ thực tế.",
  ],
  ["toeic-core", "TOEIC Core", "Từ cốt lõi cho bảy Part TOEIC."],
  [
    "workplace-english",
    "Workplace English",
    "Ngôn ngữ dùng trong công việc và văn phòng.",
  ],
  ["advanced-toeic", "Advanced TOEIC", "Từ vựng cho mục tiêu điểm TOEIC cao."],
  [
    "academic-professional",
    "Academic / Professional",
    "Ngôn ngữ học thuật và chuyên môn.",
  ],
] as const;

export const vocabularyLevelIds = vocabularyLevels.map(([id]) => id) as [
  string,
  ...string[],
];

const levelSchema = z.enum(vocabularyLevelIds);
const tokenSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const metadataSchema = z
  .object({
    correlationId: z.string().min(1),
    idempotencyStatus: z.literal("not_applicable"),
  })
  .strict();

export const topicSchema = z
  .object({
    id: tokenSchema,
    domainId: tokenSchema,
    label: z.string().min(1).max(120),
    order: z.number().int().nonnegative(),
    vocabularyCount: z.number().int().nonnegative(),
    levels: z.array(levelSchema),
    tracks: z.array(tokenSchema),
    skills: z.array(tokenSchema),
    toeicParts: z.array(z.number().int().min(1).max(7)),
  })
  .strict();

export const topicsEnvelopeSchema = z
  .object({
    data: z.array(topicSchema),
    page: z
      .object({
        number: z.number().int().positive(),
        size: z.number().int().min(1).max(50),
        totalItems: z.number().int().nonnegative(),
        totalPages: z.number().int().nonnegative(),
      })
      .strict(),
    meta: metadataSchema,
  })
  .strict();

export type MindmapNode = {
  id: string;
  kind: "domain" | "topic" | "subtopic";
  label: string;
  vocabularyCount: number;
  levels: string[];
  tracks: string[];
  skills: string[];
  toeicParts: number[];
  children: MindmapNode[];
};

export const mindmapNodeSchema: z.ZodType<MindmapNode> = z.lazy(() =>
  z
    .object({
      id: tokenSchema,
      kind: z.enum(["domain", "topic", "subtopic"]),
      label: z.string().min(1).max(120),
      vocabularyCount: z.number().int().nonnegative(),
      levels: z.array(levelSchema),
      tracks: z.array(tokenSchema),
      skills: z.array(tokenSchema),
      toeicParts: z.array(z.number().int().min(1).max(7)),
      children: z.array(mindmapNodeSchema),
    })
    .strict(),
);

export const mindmapEnvelopeSchema = z
  .object({
    data: z.object({ roots: z.array(mindmapNodeSchema) }).strict(),
    meta: metadataSchema,
  })
  .strict();

export type Topic = z.infer<typeof topicSchema>;
export type TopicsEnvelope = z.infer<typeof topicsEnvelopeSchema>;
export type MindmapEnvelope = z.infer<typeof mindmapEnvelopeSchema>;
