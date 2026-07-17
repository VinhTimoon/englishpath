import type { ZodType } from "zod";

const LOCAL_API_BASE = "http://localhost:3000/api/v1";
const REQUEST_TIMEOUT_MS = 8_000;

export class PublicApiError extends Error {
  constructor(
    readonly kind: "configuration" | "network" | "timeout" | "response",
  ) {
    super("Không thể tải dữ liệu học tập lúc này.");
    this.name = "PublicApiError";
  }
}

export function getPublicApiBase() {
  const candidate = process.env.NEXT_PUBLIC_API_BASE_URL ?? LOCAL_API_BASE;
  try {
    const url = new URL(candidate);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.pathname !== "/api/v1" ||
      candidate.endsWith("/")
    ) {
      throw new Error("invalid");
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    throw new PublicApiError("configuration");
  }
}

export async function requestPublicApi<T>(
  path: string,
  schema: ZodType<T>,
  signal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS,
  );
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(`${getPublicApiBase()}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) throw new PublicApiError("response");
    const parsed = schema.safeParse(await response.json());
    if (!parsed.success) throw new PublicApiError("response");
    return parsed.data;
  } catch (error) {
    if (error instanceof PublicApiError) throw error;
    if (controller.signal.aborted && !signal?.aborted) {
      throw new PublicApiError("timeout");
    }
    throw new PublicApiError("network");
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
