export type TimedMode = "MINI" | "HALF";
export type TimedStatus = "ACTIVE" | "SUBMITTED" | "EXPIRED";
export type TimedOption = { id: string; text: string };
export type TimedQuestion = { id: string; prompt: string; options: TimedOption[] };
export type TimedSession = {
  sessionId: string; mode: TimedMode; status: TimedStatus; total: number; answered: number;
  startedAt?: string; deadlineAt?: string; remainingSeconds: number; questions: TimedQuestion[];
  score?: number | null;
};

const forbidden = ["correctAnswer", "isCorrect", "selectedOption", "source", "license", "review", "publication", "provider"];
const rec = (v: unknown): Record<string, unknown> | null => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;
const text = (v: unknown): v is string => typeof v === "string" && v.trim().length > 0;
const int = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
function clean(value: unknown): Record<string, unknown> | null {
  const r = rec(value); if (!r || Object.keys(r).some((k) => forbidden.includes(k))) return null; return r;
}
function question(value: unknown): TimedQuestion | null {
  const r = clean(value); const options = r?.options;
  if (!r || !text(r.id) || !text(r.prompt) || !Array.isArray(options) || options.length < 2 || options.length > 6) return null;
  const safe = options.map((v) => { const o = clean(v); return o && text(o.id) && text(o.text) ? { id: o.id, text: o.text } : null; });
  return safe.every(Boolean) ? { id: r.id, prompt: r.prompt, options: safe as TimedOption[] } : null;
}
export function parseTimedSession(value: unknown): TimedSession {
  const root = rec(value); const data = rec(root?.data); const source = rec(data?.session) ?? data; const r = clean(source);
  const questionsRaw = data?.questions ?? r?.questions; const questions = Array.isArray(questionsRaw) ? questionsRaw.map(question) : [];
  if (!r || !text(r.sessionId) || (r.mode !== "MINI" && r.mode !== "HALF") || !["ACTIVE", "SUBMITTED", "EXPIRED"].includes(String(r.status)) || !int(r.total) || !int(r.answered) || !int(r.remainingSeconds) || r.total < 1 || r.answered < 0 || r.answered > r.total || r.remainingSeconds < 0 || questions.some((q) => !q)) throw new Error("INVALID_RESPONSE");
  return { sessionId: r.sessionId, mode: r.mode as TimedMode, status: r.status as TimedStatus, total: r.total, answered: r.answered, remainingSeconds: r.remainingSeconds, questions: questions as TimedQuestion[], ...(text(r.startedAt) ? { startedAt: r.startedAt } : {}), ...(text(r.deadlineAt) ? { deadlineAt: r.deadlineAt } : {}), ...(typeof r.score === "number" ? { score: r.score } : {}) };
}
export function parseTimedAnswer(value: unknown) { const r = rec(rec(value)?.data); if (!r || r.accepted !== true || !int(r.answered)) throw new Error("INVALID_RESPONSE"); return { answered: r.answered }; }
export function formatRemaining(seconds: number) { const safe = Math.max(0, seconds); return `${Math.floor(safe / 60).toString().padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`; }
