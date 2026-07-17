"use client";

import { useEffect, useState } from "react";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./learner-entry.module.css";

type Summary = {
  xp: number;
  streakDays: number;
  completedSessions: number;
  reviewErrors: number;
};

export function ProgressSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    requestLearnerApi<{ data: Summary }>("/quiz/session/summary/progress")
      .then(({ data }) => setSummary(data))
      .catch(() => setError("Chưa tải được tiến độ học tập."));
  }, []);
  if (error) return <p className={styles.error}>{error}</p>;
  if (!summary) return <p role="status">Đang tải tiến độ...</p>;
  return (
    <section className={styles.dashboardGrid} aria-label="Tiến độ học tập">
      <article className={styles.card}><strong className={styles.score}>{summary.xp}</strong><p>XP tích lũy</p></article>
      <article className={styles.card}><strong className={styles.score}>{summary.streakDays}</strong><p>Ngày streak</p></article>
      <article className={styles.card}><strong className={styles.score}>{summary.completedSessions}</strong><p>Phiên hoàn thành</p></article>
      <article className={styles.card}><strong className={styles.score}>{summary.reviewErrors}</strong><p>Lỗi cần xem lại</p></article>
    </section>
  );
}
