import Link from "next/link";
import styles from "@/widgets/public-blog/blog.module.css";

export default function ArticleNotFound() {
  return (
    <main className={styles.shell} lang="vi">
      <div className={`${styles.notFound} ${styles.frame}`}>
        <div>
          <p className={styles.eyebrow}>404 · EnglishPath Journal</p>
          <h1>Chưa tìm thấy bài viết</h1>
          <p>
            Đường dẫn có thể đã thay đổi. Kho bài học vẫn còn nhiều nội dung để
            bạn khám phá.
          </p>
          <Link href="/blog">Về trang bài viết</Link>
        </div>
      </div>
    </main>
  );
}
