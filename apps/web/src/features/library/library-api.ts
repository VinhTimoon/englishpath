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
  pagination: { page: number; size: number; total: number; pages: number };
};

export function getCatalogue(query: URLSearchParams, signal?: AbortSignal) {
  return requestLearnerApi<{ data: Catalogue }>(
    `/library/catalogue?${query.toString()}`,
    { signal },
  ).then((response) => response.data);
}

export type LibraryState = {
  item: {
    title: string;
    summary: string;
    taxonomy: {
      level: string;
      topic: string;
      subtopic?: string;
      relatedSkills: string[];
    };
    durationSeconds?: number;
    transcript: Array<{
      startSeconds: number;
      endSeconds: number;
      text: string;
    }>;
    media: { state: "AVAILABLE" | "PENDING" | "QUARANTINED" | "RETIRED" };
  };
  progress: { positionSeconds: number; status: string; version: number } | null;
  bookmarks: Array<{ timestampSeconds: number }>;
  note: { body: string; updatedAt: string } | null;
};

export function getLibraryState(versionId: string, signal?: AbortSignal) {
  return requestLearnerApi<{ data: LibraryState }>(
    `/library/items/${encodeURIComponent(versionId)}/state`,
    { signal },
  ).then((response) => response.data);
}

export type LibraryLinks = {
  status: "success" | "empty";
  versionId: string;
  links: Array<{
    kind: "roadmap" | "vocabulary" | "quiz";
    label: string;
    href: string;
    completed?: boolean;
  }>;
};

export function getLibraryLinks(versionId: string, signal?: AbortSignal) {
  return requestLearnerApi<{ data: LibraryLinks }>(
    `/library/items/${encodeURIComponent(versionId)}/links`,
    { signal },
  ).then((response) => response.data);
}

export function saveLibraryProgress(
  versionId: string,
  body: { status: string; positionSeconds: number },
) {
  return requestLearnerApi<{ data: LibraryState["progress"] }>(
    `/library/items/${encodeURIComponent(versionId)}/progress`,
    { method: "PUT", body },
  ).then((response) => response.data);
}

export function addLibraryBookmark(
  versionId: string,
  timestampSeconds: number,
) {
  return requestLearnerApi<{ data: { timestampSeconds: number } }>(
    `/library/items/${encodeURIComponent(versionId)}/bookmarks`,
    { method: "POST", body: { timestampSeconds } },
  ).then((response) => response.data);
}

export function deleteLibraryBookmark(
  versionId: string,
  timestampSeconds: number,
) {
  return requestLearnerApi<{ data: { deleted: boolean } }>(
    `/library/items/${encodeURIComponent(versionId)}/bookmarks/${timestampSeconds}`,
    { method: "DELETE" },
  ).then((response) => response.data);
}

export function saveLibraryNote(versionId: string, body: string) {
  return requestLearnerApi<{ data: { body: string; updatedAt: string } }>(
    `/library/items/${encodeURIComponent(versionId)}/note`,
    { method: "PUT", body: { body } },
  ).then((response) => response.data);
}

export type LibraryDrill = {
  drillId: string;
  versionId: string;
  questionId: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
};
export type LibraryDrillResult = {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  score: number;
  completedAt: string;
};
export function getLibraryDrill(versionId: string, signal?: AbortSignal) {
  return requestLearnerApi<{ data: LibraryDrill | null }>(
    `/library/items/${encodeURIComponent(versionId)}/drill`,
    { signal },
  ).then((r) => r.data);
}
export function submitLibraryDrill(
  versionId: string,
  body: { questionId: string; selectedOptionId: string },
) {
  return requestLearnerApi<{ data: LibraryDrillResult }>(
    `/library/items/${encodeURIComponent(versionId)}/drill/submit`,
    { method: "POST", body },
  ).then((r) => r.data);
}

export type ShadowingState = {
  item: LibraryState["item"];
  attempt: {
    attemptKey: string;
    segmentIndex: number;
    positionSeconds: number;
    status: string;
    selfRating: number | null;
    finalizedAt: string | null;
  } | null;
  history: Array<{
    attemptKey: string;
    status: string;
    selfRating: number | null;
    finalizedAt: string | null;
  }>;
};
export function getShadowing(versionId: string, signal?: AbortSignal) {
  return requestLearnerApi<{ data: ShadowingState }>(
    `/library/items/${encodeURIComponent(versionId)}/shadowing`,
    { signal },
  ).then((r) => r.data);
}
export function saveShadowing(
  versionId: string,
  body: {
    segmentIndex: number;
    positionSeconds: number;
    status: "active" | "paused";
    selfRating?: number;
  },
) {
  return requestLearnerApi<{ data: ShadowingState["attempt"] }>(
    `/library/items/${encodeURIComponent(versionId)}/shadowing`,
    { method: "PUT", body },
  ).then((r) => r.data);
}
export function finalizeShadowing(
  versionId: string,
  body: { segmentIndex: number; positionSeconds: number; selfRating: number },
) {
  return requestLearnerApi<{ data: NonNullable<ShadowingState["attempt"]> }>(
    `/library/items/${encodeURIComponent(versionId)}/shadowing/finalize`,
    { method: "POST", body },
  ).then((r) => r.data);
}
