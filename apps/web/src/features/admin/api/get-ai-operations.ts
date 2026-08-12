import { readSession } from "@/features/auth/model/auth-session";
import { AdminApiError, getAdminApiBase } from "./get-admin-overview";
import { isAiOperations, type AiOperations } from "../model/ai-operations";

type Envelope = {
  data: unknown;
  meta: { correlationId: string; idempotencyStatus: "not_applicable" };
};

function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  const keys = Object.keys(candidate).sort().join(",");
  if (keys !== "data,meta") return false;
  const meta = candidate.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const metadata = meta as Record<string, unknown>;
  return (
    Object.keys(metadata).sort().join(",") ===
      "correlationId,idempotencyStatus" &&
    typeof metadata.correlationId === "string" &&
    /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(metadata.correlationId) &&
    metadata.idempotencyStatus === "not_applicable"
  );
}

export async function getAiOperations(options?: {
  signal?: AbortSignal;
}): Promise<AiOperations> {
  const session = readSession();
  if (!session) throw new AdminApiError(401);
  try {
    const response = await fetch(`${getAdminApiBase()}/admin/ai-operations`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      signal: options?.signal,
    });
    if (!response.ok) throw new AdminApiError(response.status);
    const body: unknown = await response.json();
    if (!isEnvelope(body) || !isAiOperations(body.data)) {
      throw new AdminApiError(500);
    }
    return body.data;
  } catch (error) {
    if (error instanceof AdminApiError) throw error;
    throw new AdminApiError(0);
  }
}
