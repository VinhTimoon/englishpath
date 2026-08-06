import { parseTimedAnswer, parseTimedSession, type TimedMode } from "@/entities/toeic-timed-test/model/contracts";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
const base = "/toeic/tests/sessions";
export const startTimedTest = async (clientSessionId: string, mode: TimedMode) => parseTimedSession(await requestLearnerApi<unknown>(base, { method: "POST", body: { clientSessionId, mode } }));
export const getTimedTest = async (id: string) => parseTimedSession(await requestLearnerApi<unknown>(`${base}/${id}`));
export const answerTimedTest = async (id: string, questionId: string, selectedOption: string) => parseTimedAnswer(await requestLearnerApi<unknown>(`${base}/${id}/answers`, { method: "POST", body: { questionId, selectedOption } }));
export const submitTimedTest = async (id: string) => parseTimedSession(await requestLearnerApi<unknown>(`${base}/${id}/submit`, { method: "POST" }));
export const resultTimedTest = async (id: string) => parseTimedSession(await requestLearnerApi<unknown>(`${base}/${id}/result`));
