"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./roadmap.module.css";
import type { Envelope, Roadmap } from "./roadmap.types";
import { TodayRoadmap } from "./today-roadmap";

const phaseNames: Record<string, string> = {
  FOUNDATION: "Xây nền",
  SKILL_BUILDING: "Phát triển kỹ năng",
  PRACTICE_CORRECTION: "Luyện tập và sửa lỗi",
  SIMULATION_REVIEW: "Mô phỏng và tổng ôn",
};

export function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    requestLearnerApi<Envelope<Roadmap | null>>("/roadmaps/current")
      .then(({ data }) => setRoadmap(data))
      .catch(() => setError("Chưa thể tải lộ trình."))
      .finally(() => setLoading(false));
  }, []);

  async function recalculate() {
    setBusy(true);
    setError("");
    try {
      const { data } = await requestLearnerApi<Envelope<Roadmap>>(
        "/roadmaps/recalculate",
        { method: "POST" },
      );
      setRoadmap(data);
    } catch {
      setError("Chưa thể điều chỉnh lộ trình lúc này.");
    } finally {
      setBusy(false);
    }
  }

  const phases = roadmap
    ? Array.from(new Set(roadmap.items.map(({ phase }) => phase)))
    : [];
  const progress = roadmap?.totalItems
    ? Math.round((roadmap.completedItems / roadmap.totalItems) * 100)
    : 0;

  return (
    <main className={styles.roadmap}>
      <div className={styles.actions}>
        <Link className={styles.secondary} href="/dashboard">← Dashboard</Link>
        {roadmap && (
          <button className={styles.secondary} disabled={busy} onClick={recalculate}>
            {busy ? "Đang điều chỉnh..." : "Tạo phiên bản mới"}
          </button>
        )}
      </div>
      {loading && <p role="status">Đang tải lộ trình...</p>}
      {error && <p className={styles.error}>{error}</p>}
      {roadmap ? (
        <>
          <section className={styles.hero}>
            <div>
              <p className={styles.eyebrow}>Lộ trình phiên bản {roadmap.version}</p>
              <h2>{roadmap.durationDays} ngày tiến bộ có định hướng.</h2>
              <p>Mỗi ngày {roadmap.dailyMinutes} phút, được chia theo nhịp học bạn đã chọn.</p>
            </div>
            <div className={styles.stats}>
              <div className={styles.stat}><strong>{progress}%</strong><span>Tiến độ</span></div>
              <div className={styles.stat}><strong>{roadmap.completedItems}</strong><span>Task hoàn thành</span></div>
              <div className={styles.stat}><strong>{roadmap.todayNumber}</strong><span>Ngày hiện tại</span></div>
              <div className={styles.stat}><strong>{roadmap.level}</strong><span>Điểm xuất phát</span></div>
            </div>
          </section>
          <section className={styles.phases} aria-label="Các giai đoạn lộ trình">
            {phases.map((phase, index) => {
              const count = roadmap.items.filter((item) => item.phase === phase).length;
              return (
                <article className={styles.phase} key={phase}>
                  <p className={styles.eyebrow}>Phase {index + 1}</p>
                  <h3>{phaseNames[phase] ?? phase}</h3>
                  <strong>{count} task</strong>
                </article>
              );
            })}
          </section>
          <TodayRoadmap
            key={roadmap.id}
            initialRoadmap={roadmap}
            onRoadmapChange={setRoadmap}
          />
        </>
      ) : !loading ? (
        <TodayRoadmap initialRoadmap={null} onRoadmapChange={setRoadmap} />
      ) : null}
    </main>
  );
}
