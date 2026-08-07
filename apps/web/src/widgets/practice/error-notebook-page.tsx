"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./practice.module.css";

type ErrorEntry = {
  questionId: string;
  prompt: string;
  selectedOption: string;
  correctOption: string;
  explanation: string;
  source?: "PRACTICE" | "TOEIC_TIMED_TEST";
  remediation?: { href: string; label: string };
};

type ErrorNotebookPagination = {
  page: number;
  size: number;
  total: number;
  hasNext: boolean;
};

type ErrorNotebookResponse = {
  data:
    | ErrorEntry[]
    | {
        entries: ErrorEntry[];
        pagination: ErrorNotebookPagination;
      };
};

function normalizeResponse(response: ErrorNotebookResponse) {
  if (Array.isArray(response.data)) {
    return {
      entries: response.data,
      pagination: {
        page: 1,
        size: response.data.length,
        total: response.data.length,
        hasNext: false,
      },
    };
  }
  return response.data;
}

export function ErrorNotebookPage() {
  const [entries, setEntries] = useState<ErrorEntry[] | null>(null);
  const [pagination, setPagination] = useState<ErrorNotebookPagination | null>(
    null,
  );
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);

  const source = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("source") ===
      "TOEIC_TIMED_TEST"
      ? "&source=TOEIC_TIMED_TEST"
      : "";
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      await Promise.resolve();
      if (cancelled) return;
      setEntries(null);
      setError("");
      try {
        const response = await requestLearnerApi<ErrorNotebookResponse>(
          `/quiz/session/summary/errors${
            page === 1 && !source ? "" : `?page=${page}&size=20${source}`
          }`,
        );
        if (cancelled) return;
        const normalized = normalizeResponse(response);
        setEntries(normalized.entries);
        setPagination(normalized.pagination);
      } catch {
        if (!cancelled) setError("Chưa thể tải sổ lỗi.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, retry, source]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/dashboard">
            EnglishPath
          </Link>
          <Link className={styles.secondary} href="/daily-practice">
            Luyện tập
          </Link>
        </header>
        <section className={styles.card} aria-labelledby="notebook-title">
          <p className={styles.eyebrow}>Error Notebook</p>
          <h1 id="notebook-title">Những lỗi giúp bạn tiến bộ.</h1>
          <p className={styles.notebookIntro}>
            Xem lại câu trả lời, hiểu nguyên nhân và chọn bước ôn tập tiếp theo.
          </p>
          {!entries && !error ? (
            <div
              className={styles.loadingBlock}
              role="status"
              aria-live="polite"
            >
              <span className={styles.skeleton} aria-hidden="true" />
              Đang tải sổ lỗi cần xem lại...
            </div>
          ) : null}
          {error ? (
            <div className={styles.errorState} role="alert">
              <p>{error}</p>
              <button
                type="button"
                className={styles.button}
                onClick={() => setRetry((value) => value + 1)}
              >
                Thử lại
              </button>
            </div>
          ) : null}
          {entries?.length === 0 ? (
            <div className={styles.emptyState} role="status">
              <strong>Chưa có lỗi nào cần xem lại.</strong>
              <p>Hoàn thành một bài luyện tập để xây dựng sổ lỗi cá nhân.</p>
              <Link className={styles.button} href="/daily-practice">
                Bắt đầu luyện tập
              </Link>
            </div>
          ) : null}
          {entries && entries.length > 0 ? (
            <>
              <div className={styles.notebookSummary}>
                <span>
                  {pagination?.total ?? entries.length} lỗi đã ghi nhận
                </span>
                <span>Trang {pagination?.page ?? 1}</span>
              </div>
              <ul className={styles.errors}>
                {entries.map((entry) => (
                  <li
                    className={styles.feedback}
                    key={`${entry.source ?? "PRACTICE"}-${entry.questionId}`}
                  >
                    <div className={styles.entryHeader}>
                      <strong>{entry.prompt}</strong>
                      <span className={styles.sourceTag}>
                        {entry.source === "TOEIC_TIMED_TEST"
                          ? "TOEIC"
                          : "Daily practice"}
                      </span>
                    </div>
                    <p>
                      Bạn chọn: {entry.selectedOption} · Đáp án:{" "}
                      {entry.correctOption}
                    </p>
                    <p>{entry.explanation}</p>
                    <Link
                      className={styles.remediationLink}
                      href={entry.remediation?.href ?? "/error-notebook"}
                    >
                      {entry.remediation?.label ?? "Xem lại lỗi"}
                    </Link>
                  </li>
                ))}
              </ul>
              {pagination && (pagination.page > 1 || pagination.hasNext) ? (
                <nav
                  className={styles.pagination}
                  aria-label="Phân trang sổ lỗi"
                >
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((value) => Math.max(1, value - 1))}
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={!pagination.hasNext}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Sau
                  </button>
                </nav>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}
