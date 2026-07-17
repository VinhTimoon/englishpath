import Link from "next/link";
import { Suspense } from "react";
import { vocabularyLevels } from "@/entities/vocabulary/model/vocabulary";
import { PublicVocabularyExplorer } from "./public-vocabulary-explorer";
import styles from "./public-vocabulary.module.css";

export function PublicVocabularyPage() {
  return (
    <div className={styles.page} id="top">
      <a className={styles.skipLink} href="#main-content">
        Bỏ qua đến nội dung
      </a>
      <header className={styles.header}>
        <nav className={styles.container} aria-label="Điều hướng chính">
          <Link className={styles.brand} href="/">
            English<span>Path</span>
          </Link>
          <div>
            <Link href="/">Trang chủ</Link>
            <Link href="/blog">Blog</Link>
          </div>
        </nav>
      </header>
      <main id="main-content">
        <section className={`${styles.hero} ${styles.container}`}>
          <p className={styles.kicker}>Sáu cấp độ, một cây kiến thức</p>
          <h1>Nhìn rõ từ vựng trước khi bắt đầu học.</h1>
          <p className={styles.lead}>
            Khám phá các miền, chủ đề và chủ đề con theo mục tiêu giao tiếp,
            công việc hoặc TOEIC. Đây là danh mục công khai, không phải màn hình
            tiến độ.
          </p>
          <p className={styles.disclosure}>
            <strong>Chế độ khách:</strong> lựa chọn tại đây không lưu mức độ
            thành thạo, lịch ôn hay tiến độ học.
          </p>
        </section>
        <section
          className={`${styles.levels} ${styles.container}`}
          aria-labelledby="levels-title"
        >
          <div>
            <p className={styles.kicker}>Khung nội dung v2</p>
            <h2 id="levels-title">Sáu cấp độ từ nền tảng đến chuyên môn</h2>
          </div>
          <ol>
            {vocabularyLevels.map(([id, label, description], index) => (
              <li key={id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{label}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </section>
        <div className={styles.container}>
          <Suspense
            fallback={
            <div
              className={styles.skeleton}
              role="status"
              aria-label="Đang chuẩn bị bộ lọc"
              >
                <span />
                <span />
                <span />
              </div>
            }
          >
            <PublicVocabularyExplorer />
          </Suspense>
        </div>
      </main>
      <footer className={styles.footer}>
        <div className={styles.container}>
          <p>EnglishPath · Học miễn phí, có đường đi.</p>
          <nav aria-label="Điều hướng chân trang">
            <Link href="/">Trang chủ</Link>
            <Link href="/blog">Blog</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
