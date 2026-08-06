import { readSession } from "@/features/auth/model/auth-session";
import { isAdminOverview, type AdminOverview } from "../model/admin-overview";

function getApiBase() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3005/api/v1";
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new AdminApiError(0);
  }
  const localHost = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localHost && url.protocol === "http:")) {
    throw new AdminApiError(0);
  }
  return url.toString().replace(/\/$/, "");
}

export class AdminApiError extends Error {
  constructor(readonly status: number) {
    super("Không thể tải khu vực quản trị lúc này.");
    this.name = "AdminApiError";
  }
}

type Envelope = {
  data: unknown;
  meta: { correlationId: string; idempotencyStatus: "not_applicable" };
};

function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const meta = candidate.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const metadata = meta as Record<string, unknown>;
  return (
    typeof metadata.correlationId === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(metadata.correlationId) &&
    metadata.idempotencyStatus === "not_applicable"
  );
}

export async function getAdminOverview(options?: {
  signal?: AbortSignal;
}): Promise<AdminOverview> {
  const session = readSession();
  if (!session) throw new AdminApiError(401);

  try {
    const response = await fetch(`${getApiBase()}/admin/overview`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      signal: options?.signal,
    });
    if (!response.ok) throw new AdminApiError(response.status);
    const body: unknown = await response.json();
    if (!isEnvelope(body) || !isAdminOverview(body.data)) {
      throw new AdminApiError(500);
    }
    return body.data;
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    throw new AdminApiError(0);
  }
}
