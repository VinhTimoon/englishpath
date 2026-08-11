"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { SpeakingSession } from "@/entities/toeic-speaking/model/contracts";
import {
  authorizeSpeakingPlayback,
  getSpeaking,
  issueSpeakingPlayback,
  readSpeakingPlayback,
  SPEAKING_TASK_ID,
  startSpeaking,
  submitSpeaking,
  uploadSpeakingRecording,
} from "@/features/toeic-speaking/api/speaking-api";
import {
  createSpeakingAttempt,
  forgetSpeakingAttempt,
  readSpeakingAttempt,
  rememberSpeakingAttempt,
  type SpeakingClientAttempt,
} from "@/features/toeic-speaking/model/client-session";
import { useSpeakingRecorder } from "@/features/toeic-speaking/model/use-speaking-recorder";
import {
  readSpeakingRecordingDraft,
  removeSpeakingRecordingDraft,
  saveSpeakingRecordingDraft,
} from "@/features/toeic-speaking/model/recording-draft";
import { learnerApiStatus } from "@/shared/api/learner-api-client";
import styles from "./toeic-speaking-page.module.css";

type ViewState =
  | "loading"
  | "ready"
  | "active"
  | "finalized"
  | "unavailable"
  | "error"
  | "conflict";

function viewForSession(session: SpeakingSession): ViewState {
  if (session.status === "ACTIVE") return "active";
  if (session.status === "FINALIZED" && session.submission) return "finalized";
  return "conflict";
}

function messageFor(error: unknown, action: "load" | "start" | "submit") {
  const status = learnerApiStatus(error);
  if (status === 401 || status === 403)
    return "Your session has expired. Sign in again to continue safely.";
  if (status === 404) return "This Speaking task is not available right now.";
  if (status === 409)
    return "This attempt changed or already finished. Reload its server state before continuing.";
  if (status === 422 && action === "submit")
    return "The recording did not meet the server limits. Record again with a shorter, supported clip.";
  return action === "start"
    ? "The Speaking task could not be opened. Please retry."
    : action === "submit"
      ? "The recording was not submitted. Your local preview is still available; retry safely."
      : "The Speaking attempt could not be loaded. Please retry.";
}

export function ToeicSpeakingPage() {
  const [view, setView] = useState<ViewState>("loading");
  const [session, setSession] = useState<SpeakingSession | null>(null);
  const [attempt, setAttempt] = useState<SpeakingClientAttempt | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [controlledPlayback, setControlledPlayback] = useState<
    "idle" | "loading" | "ready" | "unavailable"
  >("idle");
  const [controlledPlaybackUrl, setControlledPlaybackUrl] = useState<
    string | null
  >(null);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "saved" | "failed"
  >("idle");
  const task = session?.task;
  const recorder = useSpeakingRecorder(task?.durationSeconds ?? 3600);

  async function prepareControlledPlayback(
    recordingId: string | undefined,
  ): Promise<boolean> {
    if (!recordingId) return false;
    setControlledPlayback("loading");
    setControlledPlaybackUrl(null);
    try {
      const issued = await issueSpeakingPlayback(recordingId);
      const authorization = await authorizeSpeakingPlayback(
        recordingId,
        issued.capability,
      );
      if (!authorization.authorized) throw new Error("PLAYBACK_FORBIDDEN");
      const content = await readSpeakingPlayback(
        recordingId,
        issued.capability,
      );
      setControlledPlaybackUrl(URL.createObjectURL(content));
      setControlledPlayback("ready");
      return true;
    } catch {
      setControlledPlayback("unavailable");
      return false;
    }
  }

  async function uploadAndPrepare(recordingId: string) {
    if (!recorder.capture) return;
    setUploadState("uploading");
    try {
      await uploadSpeakingRecording(recordingId, recorder.capture.blob);
      setUploadState("saved");
    } catch {
      setUploadState("failed");
      setControlledPlayback("unavailable");
      return;
    }
    const playbackReady = await prepareControlledPlayback(recordingId);
    if (playbackReady && attempt) {
      await removeSpeakingRecordingDraft(attempt.startKey);
    }
  }

  useEffect(
    () => () => {
      if (controlledPlaybackUrl) URL.revokeObjectURL(controlledPlaybackUrl);
    },
    [controlledPlaybackUrl],
  );

  useEffect(() => {
    if (!attempt || !recorder.capture) return;
    void saveSpeakingRecordingDraft(attempt.startKey, {
      blob: recorder.capture.blob,
      contentType: recorder.capture.contentType,
      durationSeconds: recorder.capture.durationSeconds,
      sizeBytes: recorder.capture.sizeBytes,
      submissionReference: recorder.capture.submissionReference,
    });
  }, [attempt, recorder.capture]);

  async function resume(candidate: SpeakingClientAttempt) {
    setAttempt(candidate);
    if (!candidate.sessionId) {
      setView("ready");
      return;
    }
    try {
      const next = await getSpeaking(candidate.sessionId);
      setSession(next);
      setView(viewForSession(next));
      if (next.submission?.recordingId) {
        const playbackReady = await prepareControlledPlayback(
          next.submission.recordingId,
        );
        if (!playbackReady) {
          const draft = await readSpeakingRecordingDraft(candidate.startKey);
          if (draft) {
            recorder.restore(draft);
            setUploadState("failed");
          }
        } else {
          await removeSpeakingRecordingDraft(candidate.startKey);
        }
      }
    } catch (caught) {
      const status = learnerApiStatus(caught);
      setError(messageFor(caught, "load"));
      setView(
        status === 404 ? "unavailable" : status === 409 ? "conflict" : "error",
      );
    }
  }

  useEffect(() => {
    const existing = readSpeakingAttempt();
    // The stored attempt contains only opaque ids and idempotency keys.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void (existing ? resume(existing) : Promise.resolve(setView("ready")));
    // The initial resume is intentionally run once for the route mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function start() {
    if (busy) return;
    setBusy(true);
    setError("");
    const nextAttempt = attempt ?? createSpeakingAttempt(SPEAKING_TASK_ID);
    setAttempt(nextAttempt);
    try {
      const result = await startSpeaking(
        SPEAKING_TASK_ID,
        nextAttempt.startKey,
      );
      const withSession = {
        ...nextAttempt,
        sessionId: result.session.sessionId,
      };
      rememberSpeakingAttempt(withSession);
      setAttempt(withSession);
      setSession(result.session);
      setView(viewForSession(result.session));
      if (result.session.submission?.recordingId)
        void prepareControlledPlayback(result.session.submission.recordingId);
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
      const next = await getSpeaking(attempt.sessionId);
      setSession(next);
      setView(viewForSession(next));
      if (next.submission?.recordingId)
        void prepareControlledPlayback(next.submission.recordingId);
    } catch (caught) {
      setError(messageFor(caught, "load"));
      setView(learnerApiStatus(caught) === 409 ? "conflict" : "error");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!session || !attempt?.sessionId || !recorder.capture || busy) return;
    setBusy(true);
    setError("");
    let result: Awaited<ReturnType<typeof submitSpeaking>>;
    try {
      result = await submitSpeaking(
        attempt.sessionId,
        {
          contentType: recorder.capture.contentType,
          durationSeconds: recorder.capture.durationSeconds,
          sizeBytes: recorder.capture.sizeBytes,
          submissionReference: recorder.capture.submissionReference,
        },
        attempt.submitKey,
      );
    } catch (caught) {
      setError(messageFor(caught, "submit"));
      setView(learnerApiStatus(caught) === 409 ? "conflict" : "active");
      setBusy(false);
      return;
    }
    setSession(result.session);
    setView(viewForSession(result.session));
    const recordingId = result.session.submission?.recordingId;
    if (recordingId) await uploadAndPrepare(recordingId);
    setBusy(false);
  }

  async function retryRecordingUpload() {
    if (busy || !session?.submission?.recordingId || !recorder.capture) return;
    setBusy(true);
    await uploadAndPrepare(session.submission.recordingId);
    setBusy(false);
  }

  function newAttempt() {
    if (attempt) void removeSpeakingRecordingDraft(attempt.startKey);
    forgetSpeakingAttempt();
    recorder.cancel();
    setAttempt(null);
    setSession(null);
    setError("");
    setView("ready");
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/dashboard" className={styles.back}>
            Back to dashboard
          </Link>
          <p className={styles.kicker}>TOEIC Speaking</p>
          <h1>Speak clearly, one safe attempt at a time.</h1>
          <p className={styles.lede}>
            The task and attempt belong to the server. Your browser keeps only a
            temporary preview until you submit it.
          </p>
        </header>

        {view === "loading" && (
          <section className={styles.panel} aria-busy="true">
            <span className={styles.spinner} aria-hidden="true" />
            <span role="status">Loading your Speaking attempt…</span>
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
              {view === "unavailable" ? "Unavailable" : "Action needed"}
            </p>
            <h2>
              {view === "unavailable"
                ? "This task is not ready"
                : "Your attempt needs attention"}
            </h2>
            <p className={styles.stateCopy}>
              {error ||
                "Reload the server state before starting another attempt."}
            </p>
            <div className={styles.actions}>
              {view === "conflict" && attempt?.sessionId ? (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => void refresh()}
                  type="button"
                >
                  {busy ? "Loading…" : "Reload attempt"}
                </button>
              ) : (
                <button
                  className={styles.primary}
                  disabled={busy}
                  onClick={() => void start()}
                  type="button"
                >
                  {busy ? "Retrying…" : "Try again"}
                </button>
              )}
              <Link href="/dashboard" className={styles.secondary}>
                Back to dashboard
              </Link>
            </div>
          </section>
        )}

        {view === "ready" && (
          <section
            className={styles.panel}
            aria-labelledby="speaking-start-title"
          >
            <p className={styles.eyebrow}>Ready when you are</p>
            <h2 id="speaking-start-title">One server-approved Speaking task</h2>
            <p className={styles.stateCopy}>
              Allow microphone access only after you choose to record. You can
              cancel before submitting.
            </p>
            <button
              className={styles.primary}
              disabled={busy}
              onClick={() => void start()}
              type="button"
            >
              {busy ? "Opening task…" : "Start Speaking"}
            </button>
          </section>
        )}

        {view === "active" && session && task && (
          <>
            <section
              className={styles.panel}
              aria-labelledby="speaking-prompt-title"
            >
              <div className={styles.metaRow}>
                <span className={styles.pill}>
                  {task.taskType.replaceAll("_", " ")}
                </span>
                <span className={styles.metaText}>
                  Up to {task.durationSeconds}s · server validates limits
                </span>
              </div>
              <p className={styles.eyebrow}>Prompt</p>
              <h2 id="speaking-prompt-title">{task.prompt}</h2>
              <p className={styles.instruction}>{task.instruction}</p>
            </section>
            <section className={styles.panel} aria-labelledby="recording-title">
              <p className={styles.eyebrow}>Recording</p>
              <h2 id="recording-title">Record your answer</h2>
              <p className={styles.stateCopy} aria-live="polite">
                Status:{" "}
                {recorder.state === "recording"
                  ? `Recording · ${recorder.elapsedSeconds}s`
                  : recorder.state === "stopped"
                    ? "Preview ready"
                    : recorder.state === "permission-denied"
                      ? "Microphone permission denied"
                      : recorder.state === "unsupported"
                        ? "Recording is not supported in this browser"
                        : recorder.state === "cancelled"
                          ? "Recording cancelled"
                          : "Ready"}
              </p>
              {(recorder.state === "permission-denied" ||
                recorder.state === "unsupported" ||
                recorder.state === "error") && (
                <p className={styles.error} role="alert">
                  {recorder.state === "permission-denied"
                    ? "Microphone access was denied. Check browser permissions, then retry."
                    : "This browser cannot record audio. Try a supported browser or another device."}
                </p>
              )}
              {recorder.capture && (
                <div className={styles.preview}>
                  <p className={styles.label}>Private device preview</p>
                  <audio
                    controls
                    src={recorder.capture.url}
                    aria-label="Your Speaking recording preview"
                  />
                  <p className={styles.metaText}>
                    {recorder.capture.durationSeconds}s ·{" "}
                    {recorder.capture.sizeBytes} bytes · not submitted yet
                  </p>
                </div>
              )}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <div className={styles.actions}>
                {recorder.state === "recording" ? (
                  <button
                    className={styles.primary}
                    disabled={busy}
                    onClick={recorder.stop}
                    type="button"
                  >
                    Stop recording
                  </button>
                ) : (
                  <button
                    className={styles.primary}
                    disabled={busy || recorder.state === "requesting"}
                    onClick={() => void recorder.start()}
                    type="button"
                  >
                    {recorder.state === "requesting"
                      ? "Requesting microphone…"
                      : recorder.capture
                        ? "Record again"
                        : "Start recording"}
                  </button>
                )}
                {(recorder.state === "recording" || recorder.capture) && (
                  <button
                    className={styles.secondary}
                    disabled={busy}
                    onClick={recorder.cancel}
                    type="button"
                  >
                    Cancel recording
                  </button>
                )}
                <button
                  className={styles.primary}
                  disabled={busy || !recorder.capture}
                  onClick={() => void submit()}
                  type="button"
                >
                  {busy ? "Submitting…" : "Submit recording"}
                </button>
              </div>
            </section>
          </>
        )}

        {view === "finalized" && session?.submission && (
          <section className={styles.panel} aria-live="polite">
            <p className={styles.eyebrow}>Saved</p>
            <h2>Your Speaking attempt is safely recorded</h2>
            <div className={styles.resultGrid}>
              <div>
                <span>Duration</span>
                <strong>{session.submission.durationSeconds}s</strong>
              </div>
              <div>
                <span>Size</span>
                <strong>{session.submission.sizeBytes} bytes</strong>
              </div>
              <div>
                <span>Submitted</span>
                <strong>
                  {new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(session.submission.submittedAt))}
                </strong>
              </div>
            </div>
            {(controlledPlaybackUrl || recorder.capture?.url) && (
              <audio
                className={styles.audio}
                controls
                src={controlledPlaybackUrl ?? recorder.capture?.url}
                aria-label={
                  controlledPlaybackUrl
                    ? "Your server-controlled Speaking recording"
                    : "Your local Speaking recording preview"
                }
              />
            )}
            <div
              className={styles.playbackState}
              data-upload-state={uploadState}
              role="status"
              aria-live="polite"
            >
              {!session.submission.recordingId && (
                <span>
                  This attempt was saved, but server-controlled playback is
                  unavailable because the server did not provide a recording
                  reference. No playback is inferred in the browser.
                </span>
              )}
              {uploadState === "uploading" && "Saving your recording securely…"}
              {uploadState === "failed" && (
                <>
                  <span>
                    The server kept your finished attempt, but the recording
                    still needs to be uploaded.
                  </span>
                  {recorder.capture && (
                    <button
                      className={styles.secondary}
                      disabled={busy}
                      type="button"
                      onClick={() => void retryRecordingUpload()}
                    >
                      {busy ? "Retrying upload…" : "Retry recording upload"}
                    </button>
                  )}
                </>
              )}
              {controlledPlayback === "loading" &&
                "Checking server-controlled playback…"}
              {controlledPlayback === "ready" &&
                "Server-controlled playback is ready. No provider location is exposed to the browser."}
              {controlledPlayback === "unavailable" && (
                <>
                  <span>
                    Server-controlled playback is temporarily unavailable; your
                    local preview remains available.
                  </span>
                  {session.submission.recordingId &&
                    uploadState !== "failed" && (
                      <button
                        className={styles.secondary}
                        type="button"
                        onClick={() =>
                          void prepareControlledPlayback(
                            session.submission?.recordingId,
                          )
                        }
                      >
                        Retry playback authorization
                      </button>
                    )}
                </>
              )}
            </div>
            <p className={styles.stateCopy}>
              No score or official result is inferred in the browser.
            </p>
            <div className={styles.actions}>
              <Link href="/dashboard" className={styles.primary}>
                Back to dashboard
              </Link>
              <button
                className={styles.secondary}
                onClick={newAttempt}
                type="button"
              >
                Practice another task
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
