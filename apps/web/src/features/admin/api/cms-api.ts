import { readSession } from "@/features/auth/model/auth-session";
import type {
  CmsMutation,
  CmsTaxonomyNode,
  CmsTaxonomyPage,
  CmsVersion,
} from "../model/cms";

type Meta = {
  correlationId: string;
  idempotencyStatus: "created" | "replayed" | "not_applicable";
};

export class CmsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code = "INTERNAL_ERROR",
  ) {
    super(messageFor(status, code));
    this.name = "CmsApiError";
  }
}

type CmsEnvelope<T> = { data: T; meta: Meta };

function getApiBase() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3005/api/v1";
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new CmsApiError(0);
  }
  const localHost = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localHost && url.protocol === "http:")) {
    throw new CmsApiError(0);
  }
  return url.toString().replace(/\/$/, "");
}

function correlationId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cms-${crypto.randomUUID()}`;
  }
  return `cms-${Date.now()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isMeta(value: unknown): value is Meta {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["correlationId", "idempotencyStatus"])
  )
    return false;
  return (
    typeof value.correlationId === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(value.correlationId) &&
    ["created", "replayed", "not_applicable"].includes(
      String(value.idempotencyStatus),
    )
  );
}

function parseEnvelope<T>(
  value: unknown,
  parseData: (data: unknown) => T,
): CmsEnvelope<T> {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["data", "meta"]) ||
    !isMeta(value.meta) ||
    !("data" in value)
  ) {
    throw new CmsApiError(500, "INVALID_RESPONSE");
  }
  return { data: parseData(value.data), meta: value.meta };
}

function parseString(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new CmsApiError(500, "INVALID_RESPONSE");
  }
  return value;
}

function parseNullableString(value: unknown): string | null {
  if (value === null) return null;
  return parseString(value);
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new CmsApiError(500, "INVALID_RESPONSE");
  }
  return value;
}

function parseNumberArray(value: unknown): number[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "number")) {
    throw new CmsApiError(500, "INVALID_RESPONSE");
  }
  return value;
}

function parseTaxonomy(value: unknown): CmsTaxonomyNode {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      "id",
      "parentId",
      "level",
      "topic",
      "subtopic",
      "collocations",
      "relatedSkills",
      "tracks",
      "toeicParts",
    ])
  )
    throw new CmsApiError(500, "INVALID_RESPONSE");
  return {
    id: parseString(value.id),
    parentId: parseNullableString(value.parentId),
    level: parseString(value.level),
    topic: parseString(value.topic),
    subtopic: parseNullableString(value.subtopic),
    collocations: parseStringArray(value.collocations),
    relatedSkills: parseStringArray(value.relatedSkills),
    tracks: parseStringArray(value.tracks),
    toeicParts: parseNumberArray(value.toeicParts),
  };
}

function parseVersion(value: unknown): CmsVersion {
  if (
    !isRecord(value) ||
    !isRecord(value.source) ||
    !isRecord(value.governance) ||
    !hasOnlyKeys(value, [
      "id",
      "contentId",
      "previousVersionId",
      "clientRequestId",
      "contentType",
      "title",
      "body",
      "provenance",
      "usageScope",
      "accessTier",
      "taxonomyNodeId",
      "source",
      "governance",
    ]) ||
    !hasOnlyKeys(value.source, ["sourceId", "checksum", "sourceVersion"]) ||
    !hasOnlyKeys(value.governance, [
      "licenseStatus",
      "reviewStatus",
      "publishStatus",
      "reviewedAt",
      "publishedAt",
    ])
  ) {
    throw new CmsApiError(500, "INVALID_RESPONSE");
  }
  return {
    id: parseString(value.id),
    contentId: parseString(value.contentId),
    previousVersionId: parseNullableString(value.previousVersionId),
    clientRequestId: parseString(value.clientRequestId),
    contentType: parseString(value.contentType),
    title: parseString(value.title),
    body: parseString(value.body),
    provenance: parseString(value.provenance),
    usageScope: parseString(value.usageScope),
    accessTier: parseString(value.accessTier),
    taxonomyNodeId: parseString(value.taxonomyNodeId),
    source: {
      sourceId: parseString(value.source.sourceId),
      checksum: parseString(value.source.checksum),
      sourceVersion: parseString(value.source.sourceVersion),
    },
    governance: {
      licenseStatus: parseString(value.governance.licenseStatus),
      reviewStatus: parseString(value.governance.reviewStatus),
      publishStatus: parseString(value.governance.publishStatus),
      reviewedAt: parseNullableString(value.governance.reviewedAt),
      publishedAt: parseNullableString(value.governance.publishedAt),
    },
  };
}

function parseTaxonomyPage(value: unknown): CmsTaxonomyPage {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ["data", "pagination"]) ||
    !Array.isArray(value.data) ||
    !isRecord(value.pagination) ||
    !hasOnlyKeys(value.pagination, ["limit", "offset", "total", "hasNext"])
  ) {
    throw new CmsApiError(500, "INVALID_RESPONSE");
  }
  const pagination = value.pagination;
  if (
    typeof pagination.limit !== "number" ||
    typeof pagination.offset !== "number" ||
    typeof pagination.total !== "number" ||
    typeof pagination.hasNext !== "boolean"
  ) {
    throw new CmsApiError(500, "INVALID_RESPONSE");
  }
  return {
    data: value.data.map(parseTaxonomy),
    pagination: {
      limit: pagination.limit,
      offset: pagination.offset,
      total: pagination.total,
      hasNext: pagination.hasNext,
    },
  };
}

async function request<T>(
  path: string,
  parseData: (data: unknown) => T,
  init?: RequestInit,
): Promise<CmsEnvelope<T>> {
  const session = readSession();
  if (!session) throw new CmsApiError(401, "AUTH_REQUIRED");
  let response: Response;
  try {
    response = await fetch(`${getApiBase()}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        "X-Correlation-Id": correlationId(),
        ...init?.headers,
      },
    });
  } catch {
    throw new CmsApiError(0);
  }
  if (!response.ok) {
    let code = "INTERNAL_ERROR";
    try {
      const body: unknown = await response.json();
      if (
        isRecord(body) &&
        isRecord(body.error) &&
        typeof body.error.code === "string"
      ) {
        code = body.error.code;
      }
    } catch {}
    throw new CmsApiError(response.status, code);
  }
  const body: unknown = await response.json();
  return parseEnvelope(body, parseData);
}

export function listCmsTaxonomy(signal?: AbortSignal) {
  return request("/cms/taxonomy/nodes?limit=100&offset=0", parseTaxonomyPage, {
    signal,
  });
}

export function createCmsTaxonomy(
  input: Omit<CmsTaxonomyNode, "parentId"> & { parentId?: string },
) {
  return request("/cms/taxonomy/nodes", (data) => parseTaxonomy(data), {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createCmsDraft(input: Record<string, unknown>) {
  return request("/cms/content-versions", parseVersion, {
    method: "POST",
    body: JSON.stringify(input),
  }) as Promise<CmsEnvelope<CmsMutation["data"]>>;
}

export function reviewCmsVersion(id: string, input: Record<string, unknown>) {
  return request(
    `/cms/content-versions/${encodeURIComponent(id)}/review`,
    parseVersion,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
}

export function publishCmsVersion(id: string, clientRequestId: string) {
  return request(
    `/cms/content-versions/${encodeURIComponent(id)}/publish`,
    parseVersion,
    {
      method: "POST",
      body: JSON.stringify({ clientRequestId }),
    },
  );
}

function messageFor(status: number, code: string) {
  if (status === 401) return "Vui lòng đăng nhập lại để mở CMS.";
  if (status === 403) return "Vai trò hiện tại chưa được cấp thao tác này.";
  if (status === 409) return "Trạng thái nội dung đã thay đổi, hãy tải lại.";
  if (status === 400)
    return "Dữ liệu chưa hợp lệ, hãy kiểm tra lại các trường bắt buộc.";
  if (code === "INVALID_RESPONSE")
    return "API trả về dữ liệu CMS không hợp lệ.";
  return "CMS đang tạm thời không khả dụng. Hãy thử lại.";
}
