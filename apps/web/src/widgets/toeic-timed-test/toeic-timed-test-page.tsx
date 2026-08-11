"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatRemaining,
  TIMED_TEST_SHAPE,
  type TimedMode,
  type TimedSession,
} from "@/entities/toeic-timed-test/model/contracts";
import {
  answerTimedTest,
  analysisTimedTest,
  getTimedTest,
  resultTimedTest,
  startTimedTest,
  submitTimedTest,
} from "@/features/toeic-timed-test/api/timed-test-api";
import type { TimedAnalysis } from "@/entities/toeic-timed-test/model/contracts";
import {
  clearActiveSessionId,
  readActiveSessionId,
  readClientSessionId,
  writeActiveSessionId,
} from "@/features/toeic-timed-test/model/client-session";
import { learnerApiStatus } from "@/shared/api/learner-api-client";
import styles from "./toeic-timed-test-page.module.css";

function requestMessage(error: unknown, action: string): string {
  const status = learnerApiStatus(error);
  if (status === 401 || status === 403) {
    return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại rồi thử lại.";
  }
  if (status === 409) {
    return "Bài thi đã thay đổi trạng thái. Hãy tải lại để tiếp tục an toàn.";
  }
  if (status === 404) {
    return "Bộ câu hỏi chưa đủ để mở bài này. Hãy thử lại sau.";
  }
  if (status === 422) {
    return "Bài thi chưa đủ điều kiện để hoàn tất. Hãy kiểm tra các câu còn thiếu.";
  }
  return `${action} Hãy kiểm tra kết nối và thử lại.`;
}

export function ToeicTimedTestPage() {
  const [mode, setMode] = useState<TimedMode>("MINI");
  const [session, setSession] = useState<TimedSession | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState("");
  const [error, setError] = useState("");
  const [empty, setEmpty] = useState(false);
  const [retryNumber, setRetryNumber] = useState(0);
  const [analysis, setAnalysis] = useState<TimedAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(false);
  const [analysisRetry, setAnalysisRetry] = useState(0);
  const operationVersion = useRef(0);
  const answerInFlight = useRef(false);
  const latestAcknowledgedAnswered = useRef(0);
  const pendingOperations = useRef(0);

  const reconcile = useCallback(async (sessionId: string) => {
    const version = ++operationVersion.current;
    pendingOperations.current += 1;
    setBusy(true);
    try {
      const value = await resultTimedTest(sessionId);
      if (version !== operationVersion.current || answerInFlight.current)
        return;
      if (value.answered < latestAcknowledgedAnswered.current) return;
      latestAcknowledgedAnswered.current = value.answered;
      setSession(value);
      setRemaining(value.remainingSeconds);
      setError("");
      if (value.status !== "ACTIVE") clearActiveSessionId();
    } catch (reconcileError) {
      setError(
        requestMessage(
          reconcileError,
          "Chưa xác nhận được trạng thái bài thi.",
        ),
      );
    } finally {
      pendingOperations.current = Math.max(0, pendingOperations.current - 1);
      if (pendingOperations.current === 0) setBusy(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const activeSessionId = readActiveSessionId();

    if (!activeSessionId) {
      const readyTask = window.setTimeout(() => {
        if (!cancelled) setBooting(false);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(readyTask);
      };
    }

    void getTimedTest(activeSessionId)
      .then((value) => {
        if (cancelled) return;
        latestAcknowledgedAnswered.current = value.answered;
        setSession(value);
        setMode(value.mode);
        setRemaining(value.remainingSeconds);
        if (value.status !== "ACTIVE") clearActiveSessionId();
      })
      .catch((resumeError) => {
        if (cancelled) return;
        // Keep a valid session ID for transient failures so the learner can retry
        // the owner-bound GET. A confirmed missing session may be retired safely.
        if (learnerApiStatus(resumeError) === 404) clearActiveSessionId();
        setBootError(
          requestMessage(resumeError, "Chưa khôi phục được bài thi."),
        );
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [retryNumber]);

  const sessionId = session?.sessionId;
  const sessionStatus = session?.status;
  const serverRemaining = session?.remainingSeconds;

  useEffect(() => {
    if (!sessionId || sessionStatus === "ACTIVE") return;
    let cancelled = false;
    void Promise.resolve()
      .then(() => {
        if (cancelled) return null;
        setAnalysis(null);
        setAnalysisLoading(true);
        setAnalysisError(false);
        return analysisTimedTest(sessionId);
      })
      .then((value) => {
        if (value && !cancelled) setAnalysis(value);
      })
      .catch(() => {
        if (!cancelled) setAnalysisError(true);
      })
      .finally(() => {
        if (!cancelled) setAnalysisLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [analysisRetry, sessionId, sessionStatus]);

  useEffect(() => {
    // The server value is the authority; this interval only renders a local countdown.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemaining(serverRemaining ?? 0);
    if (!sessionId || sessionStatus !== "ACTIVE") return;

    let reconciliationRequested = false;
    const timer = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          if (!reconciliationRequested) {
            reconciliationRequested = true;
            void reconcile(sessionId);
          }
          return 0;
        }
        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [reconcile, serverRemaining, sessionId, sessionStatus]);

  useEffect(() => {
    if (!sessionId || sessionStatus !== "ACTIVE") return;

    const reconcileAfterInterruption = () => {
      if (document.visibilityState === "visible") void reconcile(sessionId);
    };
    const reconnect = () => void reconcile(sessionId);

    document.addEventListener("visibilitychange", reconcileAfterInterruption);
    window.addEventListener("online", reconnect);
    return () => {
      document.removeEventListener(
        "visibilitychange",
        reconcileAfterInterruption,
      );
      window.removeEventListener("online", reconnect);
    };
  }, [reconcile, sessionId, sessionStatus]);

  async function start() {
    if (busy) return;
    pendingOperations.current += 1;
    setBusy(true);
    setError("");
    setEmpty(false);
    try {
      const value = await startTimedTest(readClientSessionId(), mode);
      latestAcknowledgedAnswered.current = value.answered;
      setSession(value);
      setRemaining(value.remainingSeconds);
      setSelected("");
      writeActiveSessionId(value.sessionId);
    } catch (startError) {
      setEmpty(learnerApiStatus(startError) === 404);
      setError(requestMessage(startError, "Chưa mở được bài thi."));
    } finally {
      pendingOperations.current = Math.max(0, pendingOperations.current - 1);
      if (pendingOperations.current === 0) setBusy(false);
    }
  }

  async function answer() {
    const current =
      session?.status === "ACTIVE"
        ? session.questions[session.answered]
        : undefined;
    if (
      !session ||
      !current ||
      !selected ||
      busy ||
      pendingOperations.current > 0 ||
      remaining <= 0
    )
      return;
    ++operationVersion.current;
    answerInFlight.current = true;
    pendingOperations.current += 1;
    setBusy(true);
    setError("");
    try {
      const acknowledgement = await answerTimedTest(
        session.sessionId,
        current.id,
        selected,
      );
      latestAcknowledgedAnswered.current = Math.max(
        latestAcknowledgedAnswered.current,
        acknowledgement.answered,
      );
      setSession((previous) =>
        previous
          ? { ...previous, answered: acknowledgement.answered }
          : previous,
      );
      setSelected("");
    } catch (answerError) {
      setError(requestMessage(answerError, "Chưa ghi nhận được câu trả lời."));
    } finally {
      answerInFlight.current = false;
      pendingOperations.current = Math.max(0, pendingOperations.current - 1);
      if (pendingOperations.current === 0) setBusy(false);
    }
  }

  async function submit() {
    if (!session || session.answered < session.total || busy) return;
    pendingOperations.current += 1;
    setBusy(true);
    setError("");
    try {
      const value = await submitTimedTest(session.sessionId);
      latestAcknowledgedAnswered.current = Math.max(
        latestAcknowledgedAnswered.current,
        value.answered,
      );
      setSession(value);
      setRemaining(value.remainingSeconds);
      if (value.status !== "ACTIVE") clearActiveSessionId();
    } catch (submitError) {
      setError(requestMessage(submitError, "Chưa tải được kết quả."));
    } finally {
      pendingOperations.current = Math.max(0, pendingOperations.current - 1);
      if (pendingOperations.current === 0) setBusy(false);
    }
  }

  function startNewTest() {
    clearActiveSessionId();
    latestAcknowledgedAnswered.current = 0;
    setSession(null);
    setSelected("");
    setRemaining(0);
    setError("");
    setBootError("");
    setEmpty(false);
  }

  function retryResume() {
    setBooting(true);
    setBootError("");
    setRetryNumber((value) => value + 1);
  }

  const current =
    session?.status === "ACTIVE"
      ? session.questions[session.answered]
      : undefined;
  const showSetup = !booting && !session;
  const remainingLabel = formatRemaining(remaining);

  return (
    <main className={styles.page} aria-busy={booting || busy}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/toeic/practice" className={styles.back}>
            Về TOEIC Practice
          </Link>
          <p className={styles.kicker}>TOEIC timed test</p>
          <h1>Thi thử theo nhịp của bạn</h1>
          <p className={styles.lede}>
            Số câu, thứ tự và thời gian do máy chủ quyết định. Bạn có thể quay
            lại sau khi làm gián đoạn.
          </p>
        </header>

        {error ? (
          <p className={styles.error} aria-live="assertive">
            {error}
          </p>
        ) : null}

        {booting ? (
          <section className={styles.state} aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            <p>Đang khôi phục bài thi…</p>
          </section>
        ) : null}

        {!booting && bootError ? (
          <section
            className={styles.stateError}
            aria-labelledby="resume-error-title"
          >
            <h2 id="resume-error-title">Chưa khôi phục được bài thi</h2>
            <p>{bootError}</p>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primary}
                onClick={retryResume}
              >
                Thử khôi phục lại
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={startNewTest}
              >
                Bắt đầu bài mới
              </button>
            </div>
          </section>
        ) : null}

        {showSetup && !bootError ? (
          <section className={styles.panel} aria-labelledby="setup-title">
            <p className={styles.eyebrow}>Bước 1 · Chọn hình thức</p>
            <h2 id="setup-title">Chọn bài thi</h2>
            <p className={styles.muted}>
              Đây là bài thi được máy chủ phân bổ sẵn. Bạn không thể bỏ qua câu
              hoặc tự thay đổi thời lượng.
            </p>
            <div
              className={styles.modes}
              role="group"
              aria-label="Hình thức bài thi"
            >
              {(Object.keys(TIMED_TEST_SHAPE) as TimedMode[]).map((value) => {
                const shape = TIMED_TEST_SHAPE[value];
                return (
                  <button
                    key={value}
                    type="button"
                    className={mode === value ? styles.modeActive : styles.mode}
                    aria-pressed={mode === value}
                    onClick={() => setMode(value)}
                  >
                    <strong>{value}</strong>
                    <span>
                      {shape.total} câu · {shape.minutes} phút
                    </span>
                  </button>
                );
              })}
            </div>
            {empty ? (
              <p className={styles.emptyState} aria-live="polite">
                Chưa có đủ nội dung đã được duyệt cho bài này. Bạn có thể thử
                lại hoặc quay về phần luyện tập.
              </p>
            ) : null}
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => void start()}
            >
              {busy ? "Đang mở bài…" : "Bắt đầu bài thi"}
            </button>
          </section>
        ) : null}

        {session?.status === "ACTIVE" && current ? (
          <>
            <section className={styles.panel} aria-labelledby="question-title">
              <div className={styles.progressRow}>
                <span>
                  Câu {session.answered + 1} / {session.total}
                </span>
                <span aria-label={`Còn ${remainingLabel}`}>
                  Còn {remainingLabel}
                </span>
              </div>
              <progress
                className={styles.progress}
                value={session.answered}
                max={session.total}
                aria-label={`Đã ghi nhận ${session.answered} trên ${session.total} câu`}
              />
              <p className={styles.progressText} aria-live="polite">
                Máy chủ đã ghi nhận {session.answered} câu.
              </p>
              <h2 id="question-title">{current.prompt}</h2>
            </section>
            <section className={styles.options} aria-labelledby="options-title">
              <h3 id="options-title">Chọn một đáp án</h3>
              <div className={styles.optionList}>
                {current.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      selected === option.id
                        ? styles.optionSelected
                        : styles.option
                    }
                    aria-pressed={selected === option.id}
                    disabled={busy || remaining <= 0}
                    onClick={() => setSelected(option.id)}
                  >
                    <b aria-hidden="true">{option.id}</b>
                    <span>{option.text}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={styles.primary}
                disabled={!selected || busy || remaining <= 0}
                onClick={() => void answer()}
              >
                {busy ? "Đang ghi nhận…" : "Ghi nhận và tiếp tục"}
              </button>
              {remaining <= 0 ? (
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => void reconcile(session.sessionId)}
                >
                  Xác nhận trạng thái bài thi
                </button>
              ) : null}
            </section>
          </>
        ) : null}

        {session?.status === "ACTIVE" && !current ? (
          <section className={styles.panel} aria-labelledby="submit-title">
            <p className={styles.eyebrow}>Đã ghi nhận đủ câu</p>
            <h2 id="submit-title">Sẵn sàng nộp bài</h2>
            <p className={styles.muted}>
              Máy chủ đã nhận đủ {session.total} câu trả lời.
            </p>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={() => void submit()}
            >
              {busy ? "Đang nộp…" : "Nộp bài"}
            </button>
          </section>
        ) : null}

        {session && session.status !== "ACTIVE" ? (
          <section
            className={styles.panel}
            aria-labelledby="result-title"
            aria-live="polite"
          >
            <p className={styles.eyebrow}>
              {session.status === "EXPIRED" ? "Hết giờ" : "Đã hoàn thành"}
            </p>
            <h2 id="result-title">
              {session.status === "EXPIRED"
                ? "Bài thi đã hết giờ"
                : "Kết quả bài thi"}
            </h2>
            <dl className={styles.resultList}>
              <div>
                <dt>Hình thức</dt>
                <dd>{session.mode}</dd>
              </div>
              <div>
                <dt>Số câu</dt>
                <dd>
                  {session.answered} / {session.total}
                </dd>
              </div>
              {typeof session.score === "number" ? (
                <div>
                  <dt>Điểm</dt>
                  <dd>{session.score}</dd>
                </div>
              ) : null}
            </dl>
            <p className={styles.muted}>
              Đây là phân tích tổng hợp từ kết quả máy chủ; không phải điểm quy
              đổi TOEIC chính thức.
            </p>
            <section
              className={styles.analysis}
              aria-live="polite"
              aria-labelledby="analysis-title"
            >
              <h3 id="analysis-title">Phân tích kết quả</h3>
              {analysisLoading ? (
                <p>Đang tải phân tích…</p>
              ) : analysisError ? (
                <p>
                  Chưa tải được phân tích. Kết quả bài thi vẫn được giữ nguyên.{" "}
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setAnalysisRetry((value) => value + 1)}
                  >
                    Thử lại
                  </button>
                </p>
              ) : analysis ? (
                <>
                  <p>
                    Kỹ năng:{" "}
                    {analysis.skills
                      .map(
                        (skill) =>
                          `${skill.skill} ${skill.correct}/${skill.total} (${skill.accuracy}%)`,
                      )
                      .join(" - ")}
                  </p>
                  <p>
                    Các phần:{" "}
                    {analysis.parts
                      .map(
                        (part) =>
                          `${part.part.replace("PART_", "Part ")} ${part.correct}/${part.total} (${part.accuracy}%)`,
                      )
                      .join(" - ")}
                  </p>
                  <p>
                    <strong>
                      {analysis.score.correct}/{analysis.score.answered}
                    </strong>{" "}
                    câu đúng · Độ chính xác {analysis.accuracy}%
                  </p>
                  <p>
                    Thời gian: {analysis.time.usedSeconds}/
                    {analysis.time.limitSeconds} giây · Trung bình{" "}
                    {analysis.time.averageSecondsPerAnswered} giây/câu đã trả
                    lời
                  </p>
                  <p>
                    Phần cần chú ý:{" "}
                    {analysis.weaknesses.length
                      ? analysis.weaknesses
                          .map((item) => `${item.name} (${item.accuracy}%)`)
                          .join(", ")
                      : "Chưa đủ câu trả lời để xác định."}
                  </p>
                </>
              ) : (
                <p>Chưa có dữ liệu phân tích.</p>
              )}
            </section>
            {analysis ? (
              <section
                className={styles.remediation}
                aria-labelledby="remediation-title"
              >
                <h3 id="remediation-title">Bước tiếp theo</h3>
                {analysis.remediation.status === "ready" ? (
                  <>
                    <p>
                      Đã lưu {analysis.remediation.count} lỗi sai để bạn ôn lại
                      trong sổ lỗi riêng.
                    </p>
                    <Link
                      className={styles.secondary}
                      href={analysis.remediation.href ?? "/error-notebook"}
                    >
                      Mở sổ lỗi TOEIC
                    </Link>
                  </>
                ) : analysis.remediation.status === "empty" ? (
                  <p>Chưa có lỗi sai nào cần ôn lại từ bài thi này.</p>
                ) : (
                  <p>
                    Chưa xác nhận được sổ lỗi. Kết quả bài thi vẫn được giữ
                    nguyên; bạn có thể mở lại sau.
                  </p>
                )}
                {analysis.remediation.status === "unavailable" ? (
                  <p>
                    Chưa tải được gói ôn tập. Kết quả vẫn được giữ nguyên; bạn
                    có thể thử lại sau.
                  </p>
                ) : analysis.remediation.packs.length > 0 ? (
                  <ul
                    className={styles.packList}
                    aria-label="Gói ôn tập đề xuất"
                  >
                    {analysis.remediation.packs.map((pack) => (
                      <li key={`${pack.kind}-${pack.href}`}>
                        <Link href={pack.href} className={styles.secondary}>
                          <strong>{pack.title}</strong>
                          <span>{pack.description}</span>
                          {pack.relatedLabel ? (
                            <small>{pack.relatedLabel}</small>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Chưa có gói nội dung phù hợp cho điểm yếu này.</p>
                )}
              </section>
            ) : null}
            <button
              type="button"
              className={styles.secondary}
              onClick={startNewTest}
            >
              Làm bài mới
            </button>
          </section>
        ) : null}
      </div>
    </main>
  );
}
