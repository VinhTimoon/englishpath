import { queryOptions } from "@tanstack/react-query";
import {
  mindmapEnvelopeSchema,
  vocabularyItemsEnvelopeSchema,
  type MindmapEnvelope,
  type VocabularyItemsEnvelope,
} from "@/entities/vocabulary/model/vocabulary";
import { requestPublicApi } from "@/shared/api/public-api-client";

export const vocabularyMindmapQuery = (enabled = true) =>
  queryOptions<MindmapEnvelope>({
    queryKey: ["learner-vocabulary", "published-mindmap"],
    queryFn: ({ signal }) =>
      requestPublicApi(
        "/vocabulary/mindmap?depth=3",
        mindmapEnvelopeSchema,
        signal,
      ),
    retry: false,
    staleTime: 60_000,
    enabled,
  });

export const vocabularyItemsQuery = (
  nodeId: string,
  page: number,
  enabled = true,
) =>
  queryOptions<VocabularyItemsEnvelope>({
    queryKey: ["learner-vocabulary", "items", nodeId, page],
    queryFn: ({ signal }) =>
      requestPublicApi(
        `/vocabulary/items?taxonomyNodeId=${encodeURIComponent(nodeId)}&page=${page}&size=20`,
        vocabularyItemsEnvelopeSchema,
        signal,
      ),
    retry: false,
    staleTime: 60_000,
    enabled,
  });
