"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type WritingSession,
  type WritingSubmission,
  type WritingFeedbackResult,
} from "@/entities/toeic-writing/model/contracts";
import {
  getWriting,
  requestWritingFeedback,
  startWriting,
  submitWriting,
  WRITING_TASK_ID,
} from "@/features/toeic-writing/api/writing-api";
import {
  createWritingAttempt,
  forgetWritingAttempt,
  readWritingAttempt,
  rememberWritingAttempt,
  type WritingClientAttempt,
} from "@/features/toeic-writing/model/client-session";
import { learnerApiStatus } from "@/shared/api/learner-api-client";
import styles from "./toeic-writing-page.module.css";

type ViewState =
  | "loading"
  | "ready"
  | "active"
  | "finalized"
  | "unavailable"
  | "error"
  | "conflict";
type FeedbackState =
  | "ready"
  | "loading"
  | "success"
  | "unavailable"
  | "denied"
  | "validation"
  | "error";

function feedbackFailureState(error: unknown): FeedbackState {
  const status = learnerApiStatus(error);
  const malformedResponse =
    error instanceof Error && error.message === "INVALID_RESPONSE";
  return malformedResponse || [401, 403, 404, 409, 422].includes(status ?? 0)
    ? "validation"
    : "error";
}

function wordCount(value: string) {
  return (
    value.trim().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0
  );
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function messageFor(error: unknown, action: "load" | "submit" | "start") {
  const status = learnerApiStatus(error);
  if (status === 401 || status === 403)
    return "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại để tiếp tục.";
  if (status === 404)
    return "Bài Writing này hiện chưa khả dụng hoặc đã được gỡ khỏi danh mục.";
  if (status === 409)
    return "Lượt Writing đã thay đổi hoặc đã hoàn tất. Hãy tải lại trạng thái để tiếp tục an toàn.";
  if (status === 422 && action === "submit")
    return "Bài viết chưa nằm trong giới hạn của đề. Hãy kiểm tra số từ rồi thử lại.";
  return action === "start"
    ? "Chưa mở được bài Writing. Hãy thử lại để lấy dữ liệu mới nhất từ máy chủ."
    : action === "submit"
      ? "Chưa gửi được bài viết. Nội dung của bạn vẫn còn trên màn hình; hãy thử lại."
      : "Chưa tải được trạng thái lượt Writing. Hãy thử lại.";
}

function safeSubmission(session: WritingSession): WritingSubmission | null {
  return session.submission;
}

function viewForSession(session: WritingSession): ViewState {
  if (session.status === "ACTIVE") return "active";
  if (session.status === "FINALIZED" && session.submission) return "finalized";
  return "conflict";
}

export function ToeicWritingPage() {
  const [view, setView] = useState<ViewState>("loading");
  const [session, setSession] = useState<WritingSession | null>(null);
  const [attempt, setAttempt] = useState<WritingClientAttempt | null>(null);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedbackState, setFeedbackState] = useState<FeedbackState>("ready");
  const [feedback, setFeedback] =
    useState<WritingFeedbackResult["feedback"]>(null);
  const feedbackBusy = useRef(false);
  const feedbackOperation = useRef(0);

  const count = useMemo(() => wordCount(text), [text]);
  const task = session?.task;
  const submission = session ? safeSubmission(session) : null;
  const bounds = task
    ? [
        task.minWords !== undefined ? `${task.minWords} từ tối thiểu` : null,
        task.maxWords !== undefined ? `${task.maxWords} từ tối đa` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "Giới hạn do máy chủ kiểm tra khi gửi";

  async function resume(candidate: WritingClientAttempt) {
    if (!candidate.sessionId) {
      setAttempt(candidate);
      setView("ready");
      return;
    }
    setAttempt(candidate);
    try {
      const resumed = await getWriting(candidate.sessionId);
      setSession(resumed);
      setView(viewForSession(resumed));
      if (viewForSession(resumed) === "finalized") {
        feedbackOperation.current += 1;
        feedbackBusy.current = false;
        setFeedback(null);
        setFeedbackState("ready");
      }
      if (viewForSession(resumed) === "conflict") {
        setError(
          "Lượt Writing này đã bị hủy hoặc không có dữ liệu hoàn tất hợp lệ.",
        );
      }
    } catch (caught) {
      if (learnerApiStatus(caught) === 404) {
        forgetWritingAttempt();
        setAttempt(null);
        setView("unavailable");
      } else {
        setError(messageFor(caught, "load"));
        const status = learnerApiStatus(caught);
        setView(status === 409 ? "conflict" : "error");
      }
    }
  }

  useEffect(() => {
    const existing = readWritingAttempt();
    // The initial resume is intentionally client-owned and never includes raw text.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void (existing ? resume(existing) : Promise.resolve(setView("ready")));
    // Initial route load only; the stored server session is the resume source.
  }, []);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    const nextAttempt = attempt ?? createWritingAttempt(WRITING_TASK_ID);
    setAttempt(nextAttempt);
    try {
      const result = await startWriting(WRITING_TASK_ID, nextAttempt.startKey);
      const withSession = {
        ...nextAttempt,
        sessionId: result.session.sessionId,
      };
      rememberWritingAttempt(withSession);
      setAttempt(withSession);
      setSession(result.session);
      setView(viewForSession(result.session));
      feedbackOperation.current += 1;
      feedbackBusy.current = false;
      setFeedback(null);
      setFeedbackState("ready");
      if (viewForSession(result.session) === "conflict") {
        setError(
          "Lượt Writing không còn hoạt động. Hãy tải lại trạng thái để không mở lại nhầm lượt.",
        );
      }
    } catch (caught) {
      setError(messageFor(caught, "start"));
      setView(learnerApiStatus(caught) === 404 ? "unavailable" : "error");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    if (!attempt?.sessionId || busy) return;
    setBusy(true);
    setError("");
    try {
      const current = await getWriting(attempt.sessionId);
      setSession(current);
      setView(viewForSession(current));
      if (viewForSession(current) === "conflict") {
        setError(
          "Lượt Writing này đã bị hủy hoặc không có dữ liệu hoàn tất hợp lệ.",
        );
      }
    } catch (caught) {
      setError(messageFor(caught, "load"));
      const status = learnerApiStatus(caught);
      setView(
        status === 404 ? "unavailable" : status === 409 ? "conflict" : "error",
      );
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!session || !attempt || !attempt.sessionId || !text.trim() || busy)
      return;
    setBusy(true);
    setError("");
    try {
      const result = await submitWriting(
        attempt.sessionId,
        text,
        attempt.submitKey,
      );
      setSession(result.session);
      setView(viewForSession(result.session));
      if (viewForSession(result.session) === "finalized") {
        feedbackOperation.current += 1;
        feedbackBusy.current = false;
        setFeedback(null);
        setFeedbackState("ready");
      }
    } catch (caught) {
      setError(messageFor(caught, "submit"));
      setView(learnerApiStatus(caught) === 409 ? "conflict" : "active");
    } finally {
      setBusy(false);
    }
  }

  function newAttempt() {
    feedbackOperation.current += 1;
    feedbackBusy.current = false;
    forgetWritingAttempt();
    setAttempt(null);
    setSession(null);
    setText("");
    setError("");
    setView("ready");
    setFeedback(null);
    setFeedbackState("ready");
  }

  async function requestFeedback() {
    if (
      !attempt?.sessionId ||
      !attempt.feedbackKey ||
      !session?.submission ||
      session.status !== "FINALIZED" ||
      attempt.sessionId !== session.sessionId ||
      (feedbackState !== "ready" && feedbackState !== "error") ||
      feedbackBusy.current
    ) {
      return;
    }
    feedbackBusy.current = true;
    const operation = ++feedbackOperation.current;
    const origin = attempt.sessionId;
    setFeedbackState("loading");
    try {
      const result = await requestWritingFeedback(origin, attempt.feedbackKey);
      if (feedbackOperation.current !== operation) return;
      setFeedback(result.feedback);
      setFeedbackState(
        result.outcome === "ALLOWED"
          ? "success"
          : result.outcome === "DENIED"
            ? "denied"
            : "unavailable",
      );
    } catch (caught) {
      if (feedbackOperation.current !== operation) return;
      setFeedbackState(feedbackFailureState(caught));
    } finally {
      if (feedbackOperation.current === operation) feedbackBusy.current = false;
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.back}>
            Về dashboard
          </Link>
          <p className={styles.kicker}>TOEIC Writing</p>
          <h1>Viết một câu trả lời rõ ràng.</h1>
          <p className={styles.lede}>
            Bài tập được lấy từ máy chủ. Bạn sẽ nhận trạng thái hoàn tất và số
            liệu kỹ thuật, không phải điểm số được suy đoán trong trình duyệt.
          </p>
        </header>

        {view === "loading" && (
          <section className={styles.panel} aria-busy="true" aria-live="polite">
            <span className={styles.spinner} aria-hidden="true" />
            Đang tải trạng thái Writing…
          </section>
        )}

        {(view === "error" ||
          view === "unavailable" ||
          view === "conflict") && (
          <section
            className={styles.panel}
            role={view === "error" ? "alert" : undefined}
          >
            <p className={styles.eyebrow}>
              {view === "unavailable" ? "Không khả dụng" : "Cần xử lý thêm"}
            </p>
            <h2>
              {view === "unavailable"
                ? "Bài Writing chưa sẵn sàng"
                : "Trạng thái chưa được xác nhận"}
            </h2>
            <p className={styles.stateCopy}>
              {error ||
                "Hãy tải lại dữ liệu để tránh gửi trùng hoặc mở lại một lượt đã hoàn tất."}
            </p>
            <div className={styles.actions}>
              {view === "conflict" && attempt?.sessionId ? (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => void refresh()}
                  type="button"
                >
                  {busy ? "Đang tải…" : "Tải lại trạng thái"}
                </button>
              ) : (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => void start()}
                  type="button"
                >
                  {busy ? "Đang thử lại…" : "Thử lại"}
                </button>
              )}
              <Link href="/dashboard" className={styles.secondary}>
                Về dashboard
              </Link>
            </div>
          </section>
        )}

        {view === "ready" && (
          <section
            className={styles.panel}
            aria-labelledby="writing-start-title"
          >
            <p className={styles.eyebrow}>Bắt đầu</p>
            <h2 id="writing-start-title">Một bài Writing đã được duyệt</h2>
            <p className={styles.stateCopy}>
              Nhấn bắt đầu để máy chủ mở đề và gửi đúng phiên của tài khoản đang
              đăng nhập.
            </p>
            <button
              className={styles.primary}
              disabled={busy}
              onClick={() => void start()}
              type="button"
            >
              {busy ? "Đang mở bài…" : "Bắt đầu Writing"}
            </button>
          </section>
        )}

        {view === "active" && session && task && (
          <>
            <section
              className={styles.panel}
              aria-labelledby="writing-prompt-title"
            >
              <div className={styles.metaRow}>
                <span className={styles.pill}>
                  Writing · {task.taskType.replaceAll("_", " ")}
                </span>
                <span className={styles.metaText}>{bounds}</span>
              </div>
              <p className={styles.eyebrow}>Đề bài</p>
              <h2 id="writing-prompt-title">{task.prompt}</h2>
              <p className={styles.instruction}>{task.instruction}</p>
            </section>
            <section
              className={styles.panel}
              aria-labelledby="writing-answer-title"
            >
              <label
                htmlFor="writing-answer"
                className={styles.label}
                id="writing-answer-title"
              >
                Câu trả lời của bạn
              </label>
              <textarea
                id="writing-answer"
                className={styles.textarea}
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={20_000}
                placeholder="Viết câu trả lời bằng tiếng Anh…"
                aria-describedby="writing-count writing-bounds"
                disabled={busy}
              />
              <div className={styles.counterRow}>
                <span id="writing-count">
                  {count} từ · {text.length} ký tự
                </span>
                <span id="writing-bounds">{bounds}</span>
              </div>
              <p className={styles.advisory}>
                Bộ đếm chỉ để tham khảo. Máy chủ sẽ kiểm tra giới hạn khi bạn
                gửi.
              </p>
              {error && (
                <p role="alert" className={styles.error}>
                  {error}
                </p>
              )}
              <button
                className={styles.primary}
                disabled={busy || !text.trim()}
                onClick={() => void submit()}
                type="button"
              >
                {busy ? "Đang gửi bài…" : "Gửi bài Writing"}
              </button>
            </section>
          </>
        )}

        {view === "finalized" && session && submission && (
          <section className={styles.panel} aria-live="polite">
            <p className={styles.eyebrow}>Đã ghi nhận</p>
            <h2>Bài viết đã được lưu an toàn</h2>
            <div className={styles.resultGrid}>
              <div>
                <span>Số từ</span>
                <strong>{submission.wordCount}</strong>
              </div>
              <div>
                <span>Ký tự</span>
                <strong>{submission.characterCount}</strong>
              </div>
              <div>
                <span>Thời điểm</span>
                <strong>{dateLabel(submission.submittedAt)}</strong>
              </div>
            </div>
            <p className={styles.stateCopy}>
              Chưa có điểm số hay phản hồi chính thức trong lượt này.
            </p>
            <section
              className={styles.feedbackBox}
              aria-busy={feedbackState === "loading"}
              aria-live="polite"
              aria-labelledby="writing-feedback-title"
              data-feedback-state={feedbackState}
            >
              <h3 id="writing-feedback-title">Phản hồi hướng dẫn</h3>
              {feedbackState === "ready" && (
                <p>
                  Nhận gợi ý ngắn gọn từ hệ thống sau khi bài viết đã được lưu.
                </p>
              )}
              {feedbackState === "loading" && (
                <p>Đang tải phản hồi hướng dẫn…</p>
              )}
              {feedbackState === "success" && feedback && (
                <>
                  <p>{feedback.summary}</p>
                  <h4>Điểm mạnh</h4>
                  <ul>
                    {feedback.strengths.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <h4>Bước tiếp theo</h4>
                  <ul>
                    {feedback.nextSteps.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              )}
              {feedbackState === "unavailable" && (
                <p>
                  Phản hồi hướng dẫn hiện chưa khả dụng. Kết quả bài Writing của
                  bạn vẫn được giữ nguyên.
                </p>
              )}
              {feedbackState === "denied" && (
                <p>
                  Yêu cầu phản hồi không được thực hiện theo giới hạn hoặc chính
                  sách hiện tại. Kết quả bài Writing vẫn được giữ nguyên.
                </p>
              )}
              {feedbackState === "validation" && (
                <p>
                  Không thể xác nhận yêu cầu phản hồi này. Kết quả bài Writing
                  vẫn được giữ nguyên. Hãy bắt đầu lượt mới hoặc tải lại phiên
                  để thử lại.
                </p>
              )}
              {feedbackState === "error" && (
                <p role="alert">Chưa tải được phản hồi. Bạn có thể thử lại.</p>
              )}
            </section>
            <div className={styles.actions}>
              {(feedbackState === "ready" ||
                feedbackState === "loading" ||
                feedbackState === "error") && (
                <button
                  className={styles.primary}
                  disabled={feedbackState === "loading"}
                  data-feedback-action="request"
                  onClick={() => void requestFeedback()}
                  type="button"
                >
                  {feedbackState === "error"
                    ? "Thử lại phản hồi"
                    : "Nhận phản hồi hướng dẫn"}
                </button>
              )}
              <Link href="/dashboard" className={styles.primary}>
                Về dashboard
              </Link>
              <button
                className={styles.secondary}
                onClick={newAttempt}
                type="button"
              >
                Luyện lượt mới
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
