import type { PracticeMode } from "@/entities/toeic-practice/model/contracts";

const PREFIX = "englishpath.toeic.practice.client";
const SETUP_KEY = "englishpath.toeic.practice.setup";
const VALID_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/;

export function clientSessionId(
  mode: PracticeMode,
  selection: { part: string; difficulty?: string; topic?: string },
) {
  const fingerprint = [mode, selection.part, selection.difficulty ?? "all", selection.topic ?? "all"]
    .map((value) => encodeURIComponent(value))
    .join(".");
  const key = `${PREFIX}.${fingerprint}`;
  if (typeof window === "undefined") return `practice-${mode}-server`;
  const current = window.localStorage.getItem(key);
  if (current && VALID_ID.test(current)) return current;
  const next = `practice-${crypto.randomUUID().replaceAll("-", "")}`;
  window.localStorage.setItem(key, next);
  return next;
}

export type StoredPracticeSetup = {
  mode: PracticeMode;
  part: string;
  difficulty: string;
  topic: string;
};

export function readPracticeSetup(): StoredPracticeSetup | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(SETUP_KEY) ?? "null") as Record<
      string,
      unknown
    > | null;
    if (
      !value ||
      (value.mode !== "listening" && value.mode !== "reading") ||
      typeof value.part !== "string" ||
      typeof value.difficulty !== "string" ||
      typeof value.topic !== "string"
    ) {
      return null;
    }
    return value as StoredPracticeSetup;
  } catch {
    return null;
  }
}

export function rememberPracticeSetup(setup: StoredPracticeSetup) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETUP_KEY, JSON.stringify(setup));
}
