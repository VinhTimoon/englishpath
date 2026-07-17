import Link from "next/link";
import { articles } from "@/entities/article/model/articles";
import styles from "./blog.module.css";

const categories = [
  "Daily English",
  "Grammar Guide",
  "TOEIC Strategy",
  "Roadmap học tiếng Anh",
];

export function BlogIndex() {
  const [featured, ...items] = articles;
  return (
    <div className={styles.shell} lang="vi">
      <BlogHeader />
      <main>
        <section className={`${styles.hero} ${styles.frame}`}>
          <div>
            <p className={styles.eyebrow}>EnglishPath Journal</p>
            <h1>
              Hiểu thêm một chút.
              <br />
              <em>Dùng tốt hơn mỗi ngày.</em>
            </h1>
          </div>
          <p>
            Ghi chú học tiếng Anh thực tế cho người Việt: ngắn gọn, có ví dụ và
            luôn hướng đến điều bạn có thể dùng.
          </p>
        </section>
        <div
          className={`${styles.categories} ${styles.frame}`}
          aria-label="Chuyên mục bài viết"
        >
          {categories.map((category) => (
            <span className={styles.category} key={category}>
              {category}
            </span>
          ))}
        </div>
        <article className={`${styles.featured} ${styles.frame}`}>
          <div className={styles.featuredContent}>
            <div className={styles.meta}>
              <span>{featured.category}</span>
              <time dateTime={featured.publishedAt}>
                {formatDate(featured.publishedAt)}
              </time>
            </div>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <Link className={styles.readLink} href={`/blog/${featured.slug}`}>
              Đọc bài viết <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className={styles.featuredAside}>
            <strong>{featured.readingMinutes}</strong>
            <span>phút đọc có mục đích</span>
          </div>
        </article>
        <section className={styles.frame} aria-labelledby="latest-title">
          <h2 className={styles.sectionTitle} id="latest-title">
            Bài học mới nhất
          </h2>
          <div className={styles.grid}>
            {items.map((article) => (
              <article className={styles.card} key={article.slug}>
                <div className={styles.meta}>
                  <span>{article.category}</span>
                  <span>{article.readingMinutes} phút</span>
                </div>
                <h2>{article.title}</h2>
                <p>{article.excerpt}</p>
                <Link
                  className={styles.readLink}
                  href={`/blog/${article.slug}`}
                >
                  Đọc và luyện <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}

export function BlogHeader() {
  return (
    <header className={`${styles.header} ${styles.frame}`}>
      <Link className={styles.brand} href="/">
        EnglishPath
      </Link>
      <nav aria-label="Điều hướng blog">
        <Link href="/">Trang chủ</Link>
        <Link href="/blog">Bài viết</Link>
      </nav>
    </header>
  );
}
export function BlogFooter() {
  return (
    <footer className={`${styles.footer} ${styles.frame}`}>
      EnglishPath Journal · Ghi chú học tập miễn phí cho người Việt.
    </footer>
  );
}
export function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
