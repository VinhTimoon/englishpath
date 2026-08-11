"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SpeakingContentType } from "@/entities/toeic-speaking/model/contracts";

export type SpeakingCapture = {
  blob: Blob;
  url: string;
  contentType: SpeakingContentType;
  durationSeconds: number;
  sizeBytes: number;
  submissionReference: string;
};

type RestoredSpeakingCapture = Omit<SpeakingCapture, "url">;

export type RecorderState =
  | "idle"
  | "requesting"
  | "recording"
  | "stopped"
  | "cancelled"
  | "permission-denied"
  | "unsupported"
  | "error";

const MIME_TYPES: SpeakingContentType[] = [
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
];

function normalizeContentType(value: string | undefined): SpeakingContentType {
  const base = value?.split(";", 1)[0]?.trim().toLowerCase();
  return MIME_TYPES.includes(base as SpeakingContentType)
    ? (base as SpeakingContentType)
    : "audio/webm";
}

export function useSpeakingRecorder(maxDurationSeconds: number) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [capture, setCapture] = useState<SpeakingCapture | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const cancelRequested = useRef(false);
  const captureUrl = useRef<string | null>(null);

  const stopTracks = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    recorder.current = null;
  }, []);

  const clearCapture = useCallback(() => {
    if (captureUrl.current) URL.revokeObjectURL(captureUrl.current);
    captureUrl.current = null;
    setCapture(null);
  }, []);

  const stop = useCallback(() => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }, []);

  const cancel = useCallback(() => {
    cancelRequested.current = true;
    stop();
    stopTracks();
    chunks.current = [];
    clearCapture();
    setElapsedSeconds(0);
    setState("cancelled");
  }, [clearCapture, stop, stopTracks]);

  const start = useCallback(async () => {
    clearCapture();
    cancelRequested.current = false;
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof window === "undefined" ||
      !window.MediaRecorder
    ) {
      setState("unsupported");
      return;
    }
    setState("requesting");
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      if (cancelRequested.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      const supported = MIME_TYPES.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const nextRecorder = supported
        ? new MediaRecorder(nextStream, { mimeType: supported })
        : new MediaRecorder(nextStream);
      const contentType = normalizeContentType(
        nextRecorder.mimeType || supported,
      );
      if (cancelRequested.current) {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      chunks.current = [];
      startedAt.current = Date.now();
      setElapsedSeconds(0);
      nextRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      nextRecorder.onstop = () => {
        const durationSeconds = Math.min(
          maxDurationSeconds,
          Math.max(1, Math.ceil((Date.now() - startedAt.current) / 1000)),
        );
        const blob = new Blob(chunks.current, { type: contentType });
        chunks.current = [];
        stopTracks();
        if (cancelRequested.current) return;
        const url = URL.createObjectURL(blob);
        captureUrl.current = url;
        setCapture({
          blob,
          url,
          contentType,
          durationSeconds,
          sizeBytes: blob.size,
          submissionReference: `browser-recording-${Date.now()}`,
        });
        setState("stopped");
      };
      nextStream.getTracks().forEach((track) => {
        track.onended = () => {
          if (recorder.current?.state === "recording") stop();
        };
      });
      stream.current = nextStream;
      recorder.current = nextRecorder;
      nextRecorder.start();
      setState("recording");
    } catch (error) {
      stopTracks();
      const name = error instanceof DOMException ? error.name : undefined;
      setState(
        name === "NotAllowedError" || name === "SecurityError"
          ? "permission-denied"
          : "error",
      );
    }
  }, [clearCapture, maxDurationSeconds, stop, stopTracks]);

  useEffect(() => {
    if (state !== "recording") return;
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt.current) / 1000);
      setElapsedSeconds(seconds);
      if (seconds >= maxDurationSeconds) stop();
    }, 250);
    return () => window.clearInterval(timer);
  }, [maxDurationSeconds, state, stop]);

  useEffect(
    () => () => {
      cancelRequested.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
      stopTracks();
      if (captureUrl.current) URL.revokeObjectURL(captureUrl.current);
    },
    [stopTracks],
  );

  const restore = useCallback(
    (draft: RestoredSpeakingCapture) => {
      clearCapture();
      const url = URL.createObjectURL(draft.blob);
      captureUrl.current = url;
      setCapture({ ...draft, url });
      setElapsedSeconds(draft.durationSeconds);
      setState("stopped");
    },
    [clearCapture],
  );

  return {
    state,
    elapsedSeconds,
    capture,
    start,
    stop,
    cancel,
    clearCapture,
    retry: () => setState("idle"),
    restore,
  };
}
