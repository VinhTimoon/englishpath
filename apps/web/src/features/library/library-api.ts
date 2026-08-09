import { requestLearnerApi } from "@/shared/api/learner-api-client";

export type Catalogue = {
  status: "success" | "empty" | "filtered-empty";
  items: Array<{
    itemId: string;
    versionId: string;
    title: string;
    summary: string;
    taxonomy: { level: string; topic: string; subtopic?: string; relatedSkills: string[] };
    contentType: string;
    durationMinutes?: number;
    level?: string;
    availability: "available";
  }>;
  facets: { levels: string[]; topics: string[]; contentTypes: string[] };
  pagination: { page: number; size: number; total: number; pages: number };
};

export function getCatalogue(query: URLSearchParams, signal?: AbortSignal) {
  return requestLearnerApi<{ data: Catalogue }>(`/library/catalogue?${query.toString()}`, { signal }).then((response) => response.data);
}

export type LibraryState = {
  item: {
    title: string;
    summary: string;
    taxonomy: { level: string; topic: string; subtopic?: string; relatedSkills: string[] };
    durationSeconds?: number;
    transcript: Array<{ startSeconds: number; endSeconds: number; text: string }>;
    media: { state: "AVAILABLE" | "PENDING" | "QUARANTINED" | "RETIRED" };
  };
  progress: { positionSeconds: number; status: string; version: number } | null;
  bookmarks: Array<{ timestampSeconds: number }>;
  note: { body: string; updatedAt: string } | null;
};

export function getLibraryState(versionId: string, signal?: AbortSignal) {
  return requestLearnerApi<{ data: LibraryState }>(`/library/items/${encodeURIComponent(versionId)}/state`, { signal }).then((response) => response.data);
}

export function saveLibraryProgress(versionId: string, body: { status: string; positionSeconds: number }) {
  return requestLearnerApi<{ data: LibraryState["progress"] }>(`/library/items/${encodeURIComponent(versionId)}/progress`, { method: "PUT", body }).then((response) => response.data);
}

export function addLibraryBookmark(versionId: string, timestampSeconds: number) {
  return requestLearnerApi<{ data: { timestampSeconds: number } }>(`/library/items/${encodeURIComponent(versionId)}/bookmarks`, { method: "POST", body: { timestampSeconds } }).then((response) => response.data);
}

export function deleteLibraryBookmark(versionId: string, timestampSeconds: number) {
  return requestLearnerApi<{ data: { deleted: boolean } }>(`/library/items/${encodeURIComponent(versionId)}/bookmarks/${timestampSeconds}`, { method: "DELETE" }).then((response) => response.data);
}

export function saveLibraryNote(versionId: string, body: string) {
  return requestLearnerApi<{ data: { body: string; updatedAt: string } }>(`/library/items/${encodeURIComponent(versionId)}/note`, { method: "PUT", body: { body } }).then((response) => response.data);
}
