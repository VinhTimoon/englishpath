"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  finalizeShadowing,
  getShadowing,
  saveShadowing,
  type ShadowingState,
} from "./library-api";

type Props = { versionId: string };

export function ShadowingWorkspace({ versionId }: Props) {
  const [data, setData] = useState<ShadowingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [permission, setPermission] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rating, setRating] = useState(3);
  const [segmentIndex, setSegmentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const next = await getShadowing(versionId);
      setData(next);
      const nextSegment = next.attempt?.segmentIndex ?? 0;
      setSegmentIndex(nextSegment);
      if (next.attempt?.selfRating) setRating(next.attempt.selfRating);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [versionId]);

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  useEffect(
    () => () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  if (loading)
    return (
      <section className="mt-8 border p-4" aria-busy="true">
        <p role="status">Loading shadowing practice...</p>
      </section>
    );

  if (error || !data)
    return (
      <section className="mt-8 border p-4" role="alert">
        <p>Shadowing practice is unavailable.</p>
        <button
          type="button"
          className="mt-3 min-h-11 border px-4"
          onClick={() => void load()}
        >
          Retry shadowing
        </button>
      </section>
    );

  if (data.item.transcript.length === 0)
    return (
      <section className="mt-8 border p-4" aria-labelledby="shadowing-heading">
        <h2 id="shadowing-heading" className="text-xl font-bold">
          Shadowing practice
        </h2>
        <p className="mt-3" role="status">
          No transcript segments are available for shadowing yet.
        </p>
      </section>
    );

  const attempt = data.attempt;
  const finalized = attempt?.status === "finalized";
  const segment = data.item.transcript[segmentIndex];
  const mediaUnavailable = data.item.media.state !== "AVAILABLE";

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      setRecording(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setPermission(
        "Microphone capture is not supported. You can still practise without recording.",
      );
      return;
    }
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const nextRecorder = new MediaRecorder(nextStream);
      chunks.current = [];
      nextRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      nextRecorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: nextRecorder.mimeType });
        chunks.current = [];
        stream.current?.getTracks().forEach((track) => track.stop());
        stream.current = null;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(URL.createObjectURL(blob));
      };
      stream.current = nextStream;
      recorder.current = nextRecorder;
      nextRecorder.start();
      setRecording(true);
      setPermission(null);
    } catch {
      setPermission(
        "Microphone permission was denied. You can still practise without recording.",
      );
    }
  }

  async function saveProgress(status: "active" | "paused") {
    if (!segment || finalized) return;
    setSaving(true);
    setActionError(null);
    try {
      const next = await saveShadowing(versionId, {
        segmentIndex,
        positionSeconds: segment.startSeconds,
        status,
        selfRating: rating,
      });
      setData((current) => (current ? { ...current, attempt: next } : current));
    } catch {
      setActionError("Progress was not saved. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!segment || finalized) return;
    setSaving(true);
    setActionError(null);
    try {
      const next = await finalizeShadowing(versionId, {
        segmentIndex,
        positionSeconds: segment.endSeconds,
        selfRating: rating,
      });
      setData((current) =>
        current
          ? { ...current, attempt: next, history: [next, ...current.history] }
          : current,
      );
    } catch {
      setActionError("The attempt was not submitted. Please retry.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 border p-4" aria-labelledby="shadowing-heading">
      <h2 id="shadowing-heading" className="text-xl font-bold">
        Shadowing practice
      </h2>
      <p className="mt-3" aria-live="polite">
        Status: {finalized ? "Submitted" : attempt ? "Resumable" : "Ready"}
      </p>
      {mediaUnavailable && (
        <p className="mt-3" role="status">
          Lesson audio is unavailable. Transcript practice and local recording
          remain available.
        </p>
      )}
      <div
        className="mt-4 flex flex-wrap gap-2"
        aria-label="Transcript segments"
      >
        {data.item.transcript.map((item, index) => (
          <button
            key={`${item.startSeconds}-${item.endSeconds}`}
            type="button"
            className="min-h-11 border px-3"
            aria-pressed={segmentIndex === index}
            disabled={saving || finalized}
            onClick={() => setSegmentIndex(index)}
          >
            Segment {index + 1}
          </button>
        ))}
      </div>
      <p className="mt-4 rounded border p-3" aria-live="polite">
        {segment?.text}
      </p>
      {previewUrl && (
        <div className="mt-4">
          <p className="text-sm font-bold">Local recording preview</p>
          <audio className="mt-2 w-full" controls src={previewUrl} />
        </div>
      )}
      {permission && (
        <p className="mt-3" role="status">
          {permission}
        </p>
      )}
      {actionError && (
        <p className="mt-3" role="alert">
          {actionError}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="min-h-11 border px-4"
          disabled={saving || finalized}
          onClick={() => void toggleRecording()}
        >
          {recording ? "Stop local recording" : "Start local recording"}
        </button>
        <button
          type="button"
          className="min-h-11 border px-4"
          disabled={saving || finalized}
          onClick={() => void saveProgress("paused")}
        >
          Save and resume later
        </button>
        <button
          type="button"
          className="min-h-11 bg-[var(--brand)] px-4 font-bold text-white"
          disabled={saving || finalized}
          onClick={() => void submit()}
        >
          Submit attempt
        </button>
      </div>
      <fieldset className="mt-4" disabled={saving || finalized}>
        <legend className="font-bold">Self-rating</legend>
        <div className="flex flex-wrap gap-3">
          {[1, 2, 3, 4, 5].map((value) => (
            <label
              key={value}
              className="inline-flex min-h-11 items-center gap-1"
            >
              <input
                type="radio"
                name={`shadow-rating-${versionId}`}
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      {data.history.length === 0 ? (
        <p className="mt-4" role="status">
          No completed shadowing attempts yet.
        </p>
      ) : (
        <p className="mt-4" role="status">
          Completed attempts: {data.history.length}
        </p>
      )}
    </section>
  );
}
