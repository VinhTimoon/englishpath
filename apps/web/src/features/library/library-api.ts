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
export type LibraryState = { item: { title:string; summary:string; taxonomy:{level:string;topic:string;subtopic?:string;relatedSkills:string[]}; durationSeconds?:number; transcript:Array<{startSeconds:number;endSeconds:number;text:string}>; media:{state:"AVAILABLE"|"PENDING"|"QUARANTINED"|"RETIRED"} }; progress: {positionSeconds:number;status:string}|null; bookmarks:Array<{timestampSeconds:number}>; note:{body:string}|null };
export function getLibraryState(versionId:string, signal?:AbortSignal) { return requestLearnerApi<{data:LibraryState}>("/library/items/"+encodeURIComponent(versionId)+"/state",{signal}).then(r=>r.data); }
export function saveLibraryProgress(versionId:string, body:{status:string;positionSeconds:number}) { return requestLearnerApi<{data:LibraryState["progress"]}>("/library/items/"+encodeURIComponent(versionId)+"/progress",{method:"PUT",body}).then(r=>r.data); }
export function saveLibraryNote(versionId:string, body:string) { return requestLearnerApi<{data:{body:string}}>("/library/items/"+encodeURIComponent(versionId)+"/note",{method:"PUT",body:{body}}).then(r=>r.data); }
