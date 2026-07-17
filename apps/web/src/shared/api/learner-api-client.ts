import { readSession } from "@/features/auth/model/auth-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1";

export class LearnerApiError extends Error {
  constructor() {
    super("Không thể lưu dữ liệu lúc này. Vui lòng thử lại.");
    this.name = "LearnerApiError";
  }
}

export async function requestLearnerApi<T>(
  path: string,
  options: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {},
): Promise<T> {
  const session = readSession();
  if (!session) throw new LearnerApiError();
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.accessToken}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    if (!response.ok) throw new LearnerApiError();
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof LearnerApiError) throw error;
    throw new LearnerApiError();
  }
}
