import { readSession } from "@/features/auth/model/auth-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3005/api/v1";

function apiBase() {
  let url: URL;
  try {
    url = new URL(API_BASE);
  } catch {
    throw new LearnerApiError();
  }
  const localHost = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !(localHost && url.protocol === "http:")) {
    throw new LearnerApiError();
  }
  return url.toString().replace(/\/$/, "");
}

export class LearnerApiError extends Error {
  constructor(
    public readonly status?: number,
    public readonly reason: "auth" | "request" = "request",
  ) {
    super("Không thể lưu dữ liệu lúc này. Vui lòng thử lại.");
    this.name = "LearnerApiError";
  }
}

export function learnerApiStatus(error: unknown): number | undefined {
  return error instanceof LearnerApiError ? error.status : undefined;
}

export function learnerApiRequiresAuth(error: unknown): boolean {
  return error instanceof LearnerApiError && error.reason === "auth";
}

export async function requestLearnerApi<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH";
    body?: unknown;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const session = readSession();
  if (!session) throw new LearnerApiError(undefined, "auth");
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: options.signal,
    });
    if (!response.ok) throw new LearnerApiError(response.status);
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof LearnerApiError) throw error;
    throw new LearnerApiError();
  }
}
