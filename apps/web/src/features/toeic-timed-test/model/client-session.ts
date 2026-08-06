const CLIENT_KEY = "englishpath.toeic.test.client";
const ACTIVE_KEY = "englishpath.toeic.test.active";
const valid = (v: string | null) => Boolean(v && /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(v));
export function readClientSessionId() { if (typeof window === "undefined") return "timed-test-server"; const old = window.localStorage.getItem(CLIENT_KEY); if (valid(old)) return old as string; const next = `test-${crypto.randomUUID().replaceAll("-", "")}`; window.localStorage.setItem(CLIENT_KEY, next); return next; }
export function readActiveSessionId() { if (typeof window === "undefined") return null; const value = window.localStorage.getItem(ACTIVE_KEY); return valid(value) ? value : null; }
export function writeActiveSessionId(id: string) { if (typeof window !== "undefined" && valid(id)) window.localStorage.setItem(ACTIVE_KEY, id); }
export function clearActiveSessionId() { if (typeof window !== "undefined") window.localStorage.removeItem(ACTIVE_KEY); }
