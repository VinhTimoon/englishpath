import { queryOptions } from "@tanstack/react-query";
import {
  mindmapEnvelopeSchema,
  topicsEnvelopeSchema,
} from "@/entities/vocabulary/model/vocabulary";
import { requestPublicApi } from "@/shared/api/public-api-client";
import { dataQuery, type VocabularyFilters } from "../model/filter-state";

export const topicsQuery = (filters: VocabularyFilters) =>
  queryOptions({
    queryKey: ["vocabulary", "topics", filters],
    queryFn: ({ signal }) =>
      requestPublicApi(
        `/vocabulary/topics?${dataQuery(filters)}`,
        topicsEnvelopeSchema,
        signal,
      ),
    retry: 1,
    staleTime: 60_000,
  });

export const mindmapQuery = (filters: VocabularyFilters) =>
  queryOptions({
    queryKey: ["vocabulary", "mindmap", filters],
    queryFn: ({ signal }) =>
      requestPublicApi(
        `/vocabulary/mindmap?${dataQuery(filters, true)}`,
        mindmapEnvelopeSchema,
        signal,
      ),
    retry: 1,
    staleTime: 60_000,
  });
