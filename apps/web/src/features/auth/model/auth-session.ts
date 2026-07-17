export const LOCAL_ACCESS_TOKEN = "englishpath.local.learner";
const SESSION_KEY = "englishpath.session";

export type LearnerSession = Readonly<{ email: string; accessToken: string }>;

export function readSession(): LearnerSession | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(
      window.localStorage.getItem(SESSION_KEY) ?? "null",
    ) as unknown;
    if (
      typeof value === "object" &&
      value !== null &&
      "email" in value &&
      "accessToken" in value &&
      typeof value.email === "string" &&
      typeof value.accessToken === "string"
    ) {
      return { email: value.email, accessToken: value.accessToken };
    }
  } catch {}
  return null;
}

export function createLocalSession(email: string): LearnerSession {
  const session = { email, accessToken: LOCAL_ACCESS_TOKEN };
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  window.localStorage.removeItem(SESSION_KEY);
}
