"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./practice.module.css";

type ErrorEntry = { questionId: string; prompt: string; selectedOption: string; correctOption: string; explanation: string };

export function ErrorNotebookPage() {
  const [entries, setEntries] = useState<ErrorEntry[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    requestLearnerApi<{ data: ErrorEntry[] }>("/quiz/session/summary/errors")
      .then(({ data }) => setEntries(data))
      .catch(() => setError("Chưa thể tải sổ lỗi."));
  }, []);
  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.header}><Link className={styles.brand} href="/dashboard">EnglishPath</Link><Link className={styles.secondary} href="/daily-practice">Luyện tập</Link></header>
    <section className={styles.card}><p className={styles.eyebrow}>Error Notebook</p><h1>Những lỗi giúp bạn tiến bộ.</h1>
      {!entries && !error && <p role="status">Đang tải lỗi cần xem lại...</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
      {entries?.length === 0 && <p>Bạn chưa có lỗi nào cần xem lại.</p>}
      <ul className={styles.errors}>{entries?.map((entry) => <li className={styles.feedback} key={entry.questionId}><strong>{entry.prompt}</strong><p>Bạn chọn: {entry.selectedOption} · Đáp án: {entry.correctOption}</p><p>{entry.explanation}</p></li>)}</ul>
    </section>
  </div></main>;
}
