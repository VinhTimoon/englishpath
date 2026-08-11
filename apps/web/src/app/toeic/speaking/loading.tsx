import styles from "@/widgets/toeic-speaking/toeic-speaking-page.module.css";

export default function Loading() {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.panel} aria-busy="true">
          <span className={styles.spinner} aria-hidden="true" />
          <span role="status">Loading Speaking…</span>
        </section>
      </div>
    </main>
  );
}
