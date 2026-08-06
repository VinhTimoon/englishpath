export type PracticeMode = "listening" | "reading";

export type SafeOption = { id: string; text: string };

export type SafeQuestion = {
  id: string;
  questionId: string;
  prompt: string;
  options: SafeOption[];
  part: string;
  questionType: string;
  difficulty: string;
  topic?: string | null;
  stimulusGroup?: string | null;
  mediaReference?: string | null;
  explanation?: string | null;
};

export type Session = {
  sessionId: string;
  status: "ACTIVE" | "SUBMITTED";
  total: number;
  answered: number;
  score?: number | null;
  listeningPart?: string | null;
  readingPart?: string | null;
  difficulty?: string | null;
  topic?: string | null;
};

export type PracticeStart = { session: Session; questions: SafeQuestion[] };
export type AnswerAcknowledgement = {
  accepted: true;
  replayed: boolean;
  questionId: string;
  answered: number;
  total: number;
};

export type PracticeCatalogue = {
  listening: { parts: string[]; difficulties: string[] };
  reading: { parts: string[]; difficulties: string[]; topics: string[] };
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function string(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function integer(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

function safeOptions(value: unknown): value is SafeOption[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.length <= 6 &&
    value.every((item) => {
      const option = record(item);
      return Boolean(option && string(option.id) && string(option.text));
    })
  );
}

function safeSession(value: unknown): Session | null {
  const session = record(value);
  if (
    !session ||
    !string(session.sessionId) ||
    (session.status !== "ACTIVE" && session.status !== "SUBMITTED") ||
    !integer(session.total) ||
    !integer(session.answered) ||
    session.total < 1 ||
    session.answered < 0 ||
    session.answered > session.total
  ) {
    return null;
  }

  return {
    sessionId: session.sessionId,
    status: session.status,
    total: session.total,
    answered: session.answered,
    ...(typeof session.score === "number" ? { score: session.score } : {}),
    ...(typeof session.listeningPart === "string"
      ? { listeningPart: session.listeningPart }
      : {}),
    ...(typeof session.readingPart === "string"
      ? { readingPart: session.readingPart }
      : {}),
    ...(typeof session.difficulty === "string"
      ? { difficulty: session.difficulty }
      : {}),
    ...(typeof session.topic === "string" ? { topic: session.topic } : {}),
  };
}

export function isSafeQuestion(value: unknown): value is SafeQuestion {
  const question = record(value);
  return Boolean(
    question &&
      string(question.id) &&
      string(question.questionId) &&
      string(question.prompt) &&
      safeOptions(question.options) &&
      string(question.part) &&
      string(question.questionType) &&
      string(question.difficulty),
  );
}

function projectSafeQuestion(value: unknown): SafeQuestion | null {
  if (!isSafeQuestion(value)) return null;
  const question = value as Record<string, unknown>;
  const options = (question.options as SafeOption[]).map((option) => ({
    id: option.id,
    text: option.text,
  }));
  return {
    id: question.id as string,
    questionId: question.questionId as string,
    prompt: question.prompt as string,
    options,
    part: question.part as string,
    questionType: question.questionType as string,
    difficulty: question.difficulty as string,
    ...(typeof question.topic === "string" || question.topic === null
      ? { topic: question.topic }
      : {}),
    ...(typeof question.stimulusGroup === "string" || question.stimulusGroup === null
      ? { stimulusGroup: question.stimulusGroup }
      : {}),
    ...(typeof question.mediaReference === "string" || question.mediaReference === null
      ? { mediaReference: question.mediaReference }
      : {}),
    ...(typeof question.explanation === "string" || question.explanation === null
      ? { explanation: question.explanation }
      : {}),
  };
}

export function parseCatalogue(value: unknown): PracticeCatalogue {
  const root = record(value);
  const data = record(root?.data);
  const listening = record(data?.listening);
  const reading = record(data?.reading);
  const validArray = (items: unknown): items is string[] =>
    Array.isArray(items) && items.every((item) => string(item));

  if (
    !listening ||
    !reading ||
    !validArray(listening.parts) ||
    !validArray(listening.difficulties) ||
    !validArray(reading.parts) ||
    !validArray(reading.difficulties) ||
    !validArray(reading.topics)
  ) {
    throw new Error("INVALID_RESPONSE");
  }

  return {
    listening: {
      parts: [...listening.parts],
      difficulties: [...listening.difficulties],
    },
    reading: {
      parts: [...reading.parts],
      difficulties: [...reading.difficulties],
      topics: [...reading.topics],
    },
  };
}

export function parseStart(value: unknown): PracticeStart {
  const root = record(value);
  const data = record(root?.data);
  if (!data || !Array.isArray(data.questions)) {
    throw new Error("INVALID_RESPONSE");
  }
  const questions = data.questions.map(projectSafeQuestion);
  if (questions.some((question) => question === null)) throw new Error("INVALID_RESPONSE");
  const session = safeSession(data.session);
  if (!session) throw new Error("INVALID_RESPONSE");
  return { session, questions: questions as SafeQuestion[] };
}

export function parseAnswer(value: unknown): AnswerAcknowledgement {
  const root = record(value);
  const data = record(root?.data);
  if (
    !data ||
    data.accepted !== true ||
    typeof data.replayed !== "boolean" ||
    !string(data.questionId) ||
    !integer(data.answered) ||
    !integer(data.total) ||
    data.answered < 1 ||
    data.total < data.answered
  ) {
    throw new Error("INVALID_RESPONSE");
  }
  return {
    accepted: true,
    replayed: data.replayed,
    questionId: data.questionId,
    answered: data.answered,
    total: data.total,
  };
}

export function parseSession(value: unknown): Session {
  const root = record(value);
  const session = safeSession(root?.data);
  if (!session) throw new Error("INVALID_RESPONSE");
  return session;
}
