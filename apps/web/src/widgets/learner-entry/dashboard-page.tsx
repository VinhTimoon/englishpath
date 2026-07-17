"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearSession } from "@/features/auth/model/auth-session";
import { requestLearnerApi } from "@/shared/api/learner-api-client";
import styles from "./learner-entry.module.css";

type Result = {
  score: number;
  total: number;
  level: string;
  skillBreakdown: Record<string, { correct: number; total: number }>;
};
type Envelope<T> = { data: T };
const levelNames: Record<string, string> = {
  BEGINNER: "Mới bắt đầu",
  ELEMENTARY: "Cơ bản",
  INTERMEDIATE: "Trung cấp",
  UPPER_INTERMEDIATE: "Khá",
  ADVANCED: "Nâng cao",
};

export function DashboardPage() {
  const router = useRouter();
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    requestLearnerApi<Envelope<Result | null>>("/placement/result")
      .then(({ data }) => setResult(data))
      .catch(() => setError("Chưa tải được kết quả."));
  }, []);
  function logout() {
    clearSession();
    router.push("/auth");
  }
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/">
            English<span>Path</span>
          </Link>
          <button className={styles.secondary} onClick={logout}>
            Đăng xuất
          </button>
        </header>
        <section className={styles.content}>
          <p className={styles.progress}>Dashboard học viên</p>
          <h1>Hôm nay học gì?</h1>
          <p className={styles.intro}>
            Điểm xuất phát đã sẵn sàng. Story tiếp theo sẽ biến kết quả này
            thành roadmap hằng ngày.
          </p>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.dashboardGrid}>
            <article className={styles.result}>
              <p>Kết quả placement</p>
              {result ? (
                <>
                  <strong className={styles.score}>
                    {result.score}/{result.total}
                  </strong>
                  <h2>{levelNames[result.level] ?? result.level}</h2>
                  <p>Đây là điểm xuất phát, không phải nhãn cố định.</p>
                </>
              ) : (
                <p>Đang tải kết quả...</p>
              )}
            </article>
            <aside className={styles.card}>
              <h2>Bước tiếp theo</h2>
              <p>
                Ôn từ vựng nền, một bài đọc ngắn và câu giao tiếp trong khoảng
                thời gian bạn đã chọn.
              </p>
              <Link className={styles.action} href="/vocabulary">
                Khám phá mindmap từ vựng
              </Link>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
