import { readSession } from "@/features/auth/model/auth-session";
import type { LibraryInventory, LibraryInventoryItem } from "../model/library-inventory";

export class LibraryInventoryError extends Error {
  constructor(readonly status: number, readonly unavailable = false) {
    super(unavailable ? "Provider inventory is unavailable." : "Inventory could not be loaded.");
  }
}

function apiBase() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3005/api/v1").replace(/\/$/, "");
}

function item(value: unknown): LibraryInventoryItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LibraryInventoryError(500);
  const v = value as Record<string, unknown>;
  const strings = ["id", "title", "contentType", "sourceType", "checksum", "sourceVersion", "rightsState", "reviewState", "publishState"];
  if (strings.some((key) => typeof v[key] !== "string") || typeof v.canReview !== "boolean" || typeof v.canPublish !== "boolean") throw new LibraryInventoryError(500);
  return Object.fromEntries([...strings, "canReview", "canPublish"].map((key) => [key, v[key]])) as LibraryInventoryItem;
}

export async function getLibraryInventory(signal?: AbortSignal): Promise<LibraryInventory> {
  const session = readSession();
  if (!session) throw new LibraryInventoryError(401);
  let response: Response;
  try {
    response = await fetch(`${apiBase()}/cms/library/inventory`, { signal, headers: { Accept: "application/json", Authorization: `Bearer ${session.accessToken}` } });
  } catch { throw new LibraryInventoryError(0, true); }
  if (response.status === 404 || response.status === 501) throw new LibraryInventoryError(response.status, true);
  if (!response.ok) throw new LibraryInventoryError(response.status);
  try {
    const body = (await response.json()) as { data?: unknown };
    if (!body || !Array.isArray(body.data)) throw new Error();
    return { data: body.data.map(item) };
  } catch { throw new LibraryInventoryError(500); }
}
