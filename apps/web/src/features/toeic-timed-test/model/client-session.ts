const CLIENT_KEY = "englishpath.toeic.test.client";
const ACTIVE_KEY = "englishpath.toeic.test.active";
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;

function valid(value: string | null): value is string {
  return Boolean(value && ID_PATTERN.test(value));
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function newClientId(): string {
  const random = globalThis.crypto?.randomUUID?.();
  if (random) return `test-${random.replaceAll("-", "")}`;
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export function readClientSessionId(): string {
  const store = storage();
  if (!store) return "timed-test-server";
  try {
    const existing = store.getItem(CLIENT_KEY);
    if (valid(existing)) return existing;
    const next = newClientId();
    store.setItem(CLIENT_KEY, next);
    return next;
  } catch {
    return newClientId();
  }
}

export function readActiveSessionId(): string | null {
  const store = storage();
  if (!store) return null;
  try {
    const value = store.getItem(ACTIVE_KEY);
    if (valid(value)) return value;
    if (value !== null) store.removeItem(ACTIVE_KEY);
    return null;
  } catch {
    return null;
  }
}

export function writeActiveSessionId(id: string): void {
  const store = storage();
  if (!store || !valid(id)) return;
  try {
    store.setItem(ACTIVE_KEY, id);
  } catch {
    // Persistence is an enhancement. The current in-memory session remains usable.
  }
}

export function clearActiveSessionId(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(ACTIVE_KEY);
  } catch {
    // Ignore storage failures and keep the finalized result visible.
  }
}
