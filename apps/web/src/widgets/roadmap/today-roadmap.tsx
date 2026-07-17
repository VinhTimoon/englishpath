"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./roadmap.module.css";
import type { Envelope, Roadmap } from "./roadmap.types";

export function TodayRoadmap({
  initialRoadmap,
  onRoadmapChange,
}: {
  initialRoadmap?: Roadmap | null;
  onRoadmapChange?: (roadmap: Roadmap) => void;
}) {
  const hasInitialRoadmap = initialRoadmap !== undefined;
  const [roadmap, setRoadmap] = useState<Roadmap | null>(initialRoadmap ?? null);
  const [loading, setLoading] = useState(!hasInitialRoadmap);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (hasInitialRoadmap) return;
    requestLearnerApi<Envelope<Roadmap | null>>("/roadmaps/current")
      .then(({ data }) => setRoadmap(data))
      .catch(() => setError("Chưa thể tải kế hoạch hôm nay."))
      .finally(() => setLoading(false));
  }, [hasInitialRoadmap]);

  async function generate() {
    setBusy("generate");
    setError("");
    try {
      const { data } = await requestLearnerApi<Envelope<Roadmap>>(
        "/roadmaps/generate",
        { method: "POST" },
      );
      setRoadmap(data);
      onRoadmapChange?.(data);
    } catch {
      setError("Hãy hoàn tất onboarding và placement trước khi tạo lộ trình.");
    } finally {
      setBusy("");
    }
  }

  async function complete(itemId: string) {
    setBusy(itemId);
    try {
      const { data } = await requestLearnerApi<Envelope<Roadmap>>(
        `/roadmaps/items/${itemId}/status`,
        { method: "PATCH", body: { status: "COMPLETED" } },
      );
      setRoadmap(data);
      onRoadmapChange?.(data);
    } catch {
      setError("Chưa thể cập nhật bài học. Hãy thử lại.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return <p role="status">Đang chuẩn bị kế hoạch hôm nay...</p>;
  if (!roadmap) {
    return (
      <section className={styles.empty}>
        <p className={styles.eyebrow}>Bước tiếp theo</p>
        <h2>Tạo lộ trình đầu tiên của bạn</h2>
        <p>Hệ thống dùng mục tiêu, thời gian học và placement để chia việc theo ngày.</p>
        {error && <p className={styles.error}>{error}</p>}
        <button className={styles.button} disabled={!!busy} onClick={generate}>
          {busy ? "Đang tạo..." : "Tạo lộ trình của tôi"}
        </button>
      </section>
    );
  }

  return (
    <section className={styles.today}>
      <div className={styles.todayHeader}>
        <div>
          <p className={styles.eyebrow}>Ngày {roadmap.todayNumber}</p>
          <h2>Việc học hôm nay</h2>
        </div>
        <Link className={styles.secondary} href="/roadmap">
          Xem toàn lộ trình
        </Link>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.taskList}>
        {roadmap.todayItems.map((item) => (
          <article
            className={`${styles.task} ${item.status === "COMPLETED" ? styles.taskDone : ""}`}
            key={item.id}
          >
            <div>
              <p>{item.title}</p>
              <small>{item.skill} · {item.minutes} phút</small>
            </div>
            {item.status === "COMPLETED" ? (
              <strong>Đã xong</strong>
            ) : (
              <button
                className={styles.button}
                disabled={busy === item.id}
                onClick={() => complete(item.id)}
              >
                {busy === item.id ? "Đang lưu..." : "Hoàn thành"}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
