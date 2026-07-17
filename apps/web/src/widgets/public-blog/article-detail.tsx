import Link from "next/link";
import { getAbsoluteSiteUrl } from "@/entities/article/config/site-origin";
import type { Article } from "@/entities/article/model/articles";
import { getArticle } from "@/entities/article/model/articles";
import { BlogFooter, BlogHeader, formatDate } from "./blog-index";
import styles from "./blog.module.css";

function safeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function ArticleDetail({ article }: { article: Article }) {
  const related = article.relatedSlugs.flatMap((slug) => {
    const item = getArticle(slug);
    return item ? [item] : [];
  });
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.metaDescription,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "vi-VN",
    author: { "@type": "Organization", name: "EnglishPath" },
    publisher: { "@type": "Organization", name: "EnglishPath" },
    mainEntityOfPage: getAbsoluteSiteUrl(`/blog/${article.slug}`),
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className={styles.shell} lang="vi">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
      />
      <BlogHeader />
      <main className={`${styles.article} ${styles.frame}`}>
        <header className={styles.articleHeader}>
          <Link className={styles.back} href="/blog">
            ← Tất cả bài viết
          </Link>
          <p className={styles.eyebrow}>{article.category}</p>
          <h1>{article.title}</h1>
          <div className={styles.meta}>
            <time dateTime={article.publishedAt}>
              {formatDate(article.publishedAt)}
            </time>
            <span>{article.readingMinutes} phút đọc</span>
            <span>Cập nhật {formatDate(article.updatedAt)}</span>
          </div>
        </header>
        <article className={styles.articleLayout}>
          <div className={styles.prose}>
            {article.sections.map((section, index) => (
              <section
                key={section.heading}
                aria-labelledby={`${article.slug}-section-${index + 1}`}
              >
                <h2 id={`${article.slug}-section-${index + 1}`}>
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.example && (
                  <aside
                    className={styles.example}
                    aria-label={`Ví dụ: ${section.example.label}`}
                  >
                    <span>{section.example.label}</span>
                    <strong lang="en">{section.example.english}</strong>
                    <p>{section.example.vietnamese}</p>
                  </aside>
                )}
              </section>
            ))}
          </div>
          <aside className={styles.aside}>
            <h2>Trong bài này</h2>
            <div className={styles.tags}>
              {article.tags.map((tag) => (
                <span className={styles.tag} key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </aside>
        </article>
        <section className={styles.faq} aria-labelledby="faq-title">
          <h2 id="faq-title">Câu hỏi thường gặp</h2>
          {article.faq.map((item) => (
            <details key={item.question}>
              <summary>{item.question}</summary>
              <p>{item.answer}</p>
            </details>
          ))}
        </section>
        <section className={styles.related} aria-labelledby="related-title">
          <h2 id="related-title">Học tiếp từ đây</h2>
          <div className={styles.relatedLinks}>
            {related.map((item) => (
              <Link key={item.slug} href={`/blog/${item.slug}`}>
                <span>{item.title}</span>
                <span aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <BlogFooter />
    </div>
  );
}
