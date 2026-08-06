import styles from "@/widgets/toeic-practice/toeic-practice-page.module.css";

export default function Loading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.panel} aria-label="Đang tải" aria-busy="true">
          <span className={styles.spinner} aria-hidden="true" />
          Đang tải bài luyện tập…
        </div>
      </div>
    </main>
  );
}
