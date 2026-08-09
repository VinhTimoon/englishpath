import { requestLearnerApi } from "@/shared/api/learner-api-client";

export type Catalogue = { status: "success" | "empty" | "filtered-empty"; items: Array<{ itemId: string; versionId: string; title: string; summary: string; taxonomy: { level: string; topic: string }; contentType: string; durationMinutes?: number; level?: string; availability: "available" }>; facets: { levels: string[]; topics: string[]; contentTypes: string[] }; pagination: { page: number; size: number; total: number; pages: number } };
export function getCatalogue(query: URLSearchParams) { return requestLearnerApi<Catalogue>(`/library/catalogue?${query.toString()}`); }
