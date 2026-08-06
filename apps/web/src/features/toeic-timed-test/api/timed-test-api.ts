import {
  parseTimedAnalysis,
  parseTimedAnswer,
  parseTimedSession,
  type TimedMode,
} from "@/entities/toeic-timed-test/model/contracts";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
const base = "/toeic/tests/sessions";
export const startTimedTest = async (
  clientSessionId: string,
  mode: TimedMode,
) =>
  parseTimedSession(
    await requestLearnerApi<unknown>(base, {
      method: "POST",
      body: { clientSessionId, mode },
    }),
  );
export const getTimedTest = async (id: string) =>
  parseTimedSession(await requestLearnerApi<unknown>(`${base}/${id}`));
export const answerTimedTest = async (
  id: string,
  questionId: string,
  selectedOption: string,
) =>
  parseTimedAnswer(
    await requestLearnerApi<unknown>(`${base}/${id}/answers`, {
      method: "POST",
      body: { questionId, selectedOption },
    }),
  );
export const submitTimedTest = async (id: string) =>
  parseTimedSession(
    await requestLearnerApi<unknown>(`${base}/${id}/submit`, {
      method: "POST",
    }),
  );
export const resultTimedTest = async (id: string) =>
  parseTimedSession(await requestLearnerApi<unknown>(`${base}/${id}/result`));
export const analysisTimedTest = async (id: string) =>
  (() => {
    const request = requestLearnerApi<unknown>(`${base}/${id}/analysis`);
    return request.then((payload) => {
      const root =
        typeof payload === "object" && payload !== null
          ? (payload as Record<string, unknown>)
          : null;
      const data =
        typeof root?.data === "object" && root.data !== null
          ? (root.data as Record<string, unknown>)
          : null;
      return data && data.analysis === null
        ? null
        : parseTimedAnalysis(payload);
    });
  })();
