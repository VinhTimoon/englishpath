import { requestLearnerApi } from "@/shared/api/learner-api-client";

export type Catalogue = {
  status: "success" | "empty" | "filtered-empty";
  items: Array<{
    itemId: string;
    versionId: string;
    title: string;
    summary: string;
    taxonomy: {
      level: string;
      topic: string;
      subtopic?: string;
      relatedSkills: string[];
    };
    contentType: string;
    durationMinutes?: number;
    level?: string;
    availability: "available";
  }>;
  facets: { levels: string[]; topics: string[]; contentTypes: string[] };
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
};

type CatalogueEnvelope = { data: Catalogue };

export function getCatalogue(query: URLSearchParams, signal?: AbortSignal) {
  return requestLearnerApi<CatalogueEnvelope>(
    `/library/catalogue?${query.toString()}`,
    { signal },
  ).then((response) => response.data);
}
