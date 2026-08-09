"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addLibraryBookmark,
  deleteLibraryBookmark,
  getLibraryState,
  saveLibraryNote,
  saveLibraryProgress,
  type LibraryState,
} from "@/features/library/library-api";
import { LibraryDrillPanel } from "@/features/library/library-drill";
import { ShadowingWorkspace } from "@/features/library/shadowing-workspace";
import { RelatedLearningPanel } from "./related-learning-panel";

type Props = { versionId: string };

export function LibraryItemPage({ versionId }: Props) {
  const [data, setData] = useState<LibraryState | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingNote, setSavingNote] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState<number | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const next = await getLibraryState(versionId, signal);
        setData(next);
        setNote(next.note?.body ?? "");
      } catch {
        if (!signal?.aborted)
          setError("Không thể tải nội dung. Vui lòng thử lại.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [versionId],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => void load(controller.signal));
    return () => controller.abort();
  }, [load]);

  const bookmarked = useMemo(
    () =>
      new Set(
        (data?.bookmarks ?? []).map((bookmark) => bookmark.timestampSeconds),
      ),
    [data?.bookmarks],
  );

  async function updateProgress(
    status: "in_progress" | "completed",
    positionSeconds: number,
  ) {
    setSavingProgress(true);
    setActionError(null);
    try {
      const progress = await saveLibraryProgress(versionId, {
        status,
        positionSeconds,
      });
      setData((current) => (current ? { ...current, progress } : current));
    } catch {
      setActionError(
        "Không thể lưu tiến độ. Tiến độ trên máy chủ chưa thay đổi.",
      );
    } finally {
      setSavingProgress(false);
    }
  }

  async function toggleBookmark(timestampSeconds: number) {
    setSavingBookmark(timestampSeconds);
    setActionError(null);
    try {
      if (bookmarked.has(timestampSeconds)) {
        await deleteLibraryBookmark(versionId, timestampSeconds);
        setData((current) =>
          current
            ? {
                ...current,
                bookmarks: current.bookmarks.filter(
                  (item) => item.timestampSeconds !== timestampSeconds,
                ),
              }
            : current,
        );
      } else {
        const bookmark = await addLibraryBookmark(versionId, timestampSeconds);
        setData((current) =>
          current &&
          !current.bookmarks.some(
            (item) => item.timestampSeconds === bookmark.timestampSeconds,
          )
            ? {
                ...current,
                bookmarks: [...current.bookmarks, bookmark].sort(
                  (a, b) => a.timestampSeconds - b.timestampSeconds,
                ),
              }
            : current,
        );
      }
    } catch {
      setActionError("Không thể lưu dấu mốc. Vui lòng thử lại.");
    } finally {
      setSavingBookmark(null);
    }
  }

  async function saveNote() {
    setSavingNote(true);
    setActionError(null);
    try {
      const saved = await saveLibraryNote(versionId, note);
      setData((current) => (current ? { ...current, note: saved } : current));
      setNote(saved.body);
    } catch {
      setActionError(
        "Không thể lưu ghi chú. Nội dung chưa lưu vẫn được giữ lại.",
      );
    } finally {
      setSavingNote(false);
    }
  }

  if (loading)
    return (
      <main className="mx-auto max-w-3xl px-4 py-10" aria-busy="true">
        <p role="status">Đang tải nội dung…</p>
      </main>
    );
  if (error || !data)
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <p role="alert">{error ?? "Không tìm thấy nội dung."}</p>
        <button
          type="button"
          className="mt-4 min-h-11 border px-4"
          onClick={() => void load()}
        >
          Thử lại
        </button>
      </main>
    );

  const { item, progress } = data;
  const unavailable = item.media.state !== "AVAILABLE";
  const duration = item.durationSeconds;
  const position = progress?.positionSeconds ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 text-[var(--ink)] sm:py-10">
      <p className="text-sm font-bold uppercase text-[var(--brand)]">
        {item.taxonomy.level} · {item.taxonomy.topic}
      </p>
      <h1 className="mt-2 text-3xl font-bold">{item.title}</h1>
      <p className="mt-3 text-[var(--ink-muted)]">{item.summary}</p>

      <section
        className="mt-6 border border-[var(--border)] p-4"
        aria-labelledby="media-heading"
      >
        <h2 id="media-heading" className="font-bold">
          Media: {item.media.state}
        </h2>
        {unavailable ? (
          <p className="mt-2">
            Media chưa sẵn sàng; bạn vẫn có thể đọc transcript.
          </p>
        ) : (
          <p className="mt-2">
            Media đã được kiểm soát. Liên kết phát trực tiếp chỉ xuất hiện khi
            máy chủ cấp quyền an toàn.
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="min-h-11 border px-4"
            disabled={savingProgress}
            onClick={() => void updateProgress("in_progress", position)}
          >
            {savingProgress ? "Đang lưu…" : `Tiếp tục từ ${position}s`}
          </button>
          {duration !== undefined && (
            <button
              type="button"
              className="min-h-11 bg-[var(--brand)] px-4 font-bold text-white"
              disabled={savingProgress}
              onClick={() => void updateProgress("completed", duration)}
            >
              Đánh dấu hoàn tất
            </button>
          )}
        </div>
      </section>

      {actionError && (
        <p className="mt-4" role="alert">
          {actionError}
        </p>
      )}

      <section className="mt-8" aria-labelledby="transcript-heading">
        <h2 id="transcript-heading" className="text-xl font-bold">
          Transcript
        </h2>
        {item.transcript.length === 0 ? (
          <p className="mt-3" role="status">
            Chưa có transcript.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {item.transcript.map((segment) => (
              <li
                key={`${segment.startSeconds}-${segment.endSeconds}`}
                className="flex gap-3 border-b border-[var(--border)] pb-3"
              >
                <button
                  type="button"
                  className="min-h-11 shrink-0 underline"
                  aria-label={`Đánh dấu tại ${segment.startSeconds} giây`}
                  aria-pressed={bookmarked.has(segment.startSeconds)}
                  disabled={savingBookmark === segment.startSeconds}
                  onClick={() => void toggleBookmark(segment.startSeconds)}
                >
                  {bookmarked.has(segment.startSeconds)
                    ? "Đã đánh dấu"
                    : `${segment.startSeconds}s`}
                </button>
                <span>{segment.text}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
      <LibraryDrillPanel versionId={versionId} />
      <ShadowingWorkspace versionId={versionId} />
      <RelatedLearningPanel versionId={versionId} />

      <section className="mt-8" aria-labelledby="notes-heading">
        <h2 id="notes-heading" className="text-xl font-bold">
          Ghi chú cá nhân
        </h2>
        <label className="mt-3 block font-bold" htmlFor="library-note">
          Ghi chú riêng của bạn
        </label>
        <textarea
          id="library-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={5000}
          className="mt-2 min-h-32 w-full border p-3"
        />
        <p className="mt-1 text-sm text-[var(--ink-muted)]">
          {note.length}/5000
        </p>
        <button
          type="button"
          disabled={savingNote}
          onClick={() => void saveNote()}
          className="mt-3 min-h-11 bg-[var(--brand)] px-4 font-bold text-white"
        >
          {savingNote ? "Đang lưu…" : "Lưu ghi chú"}
        </button>
      </section>
    </main>
  );
}
