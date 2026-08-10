import styles from "@/widgets/toeic-writing/toeic-writing-page.module.css";

export default function Loading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.panel} aria-busy="true" aria-label="Đang tải">
          <span className={styles.spinner} aria-hidden="true" />
          Đang tải bài Writing…
        </div>
      </div>
    </main>
  );
}
