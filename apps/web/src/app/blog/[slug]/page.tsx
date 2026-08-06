import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAbsoluteSiteUrl } from "@/entities/article/config/site-origin";
import {
  getArticle,
  publishedArticles,
} from "@/entities/article/model/articles";
import { ArticleDetail } from "@/widgets/public-blog/article-detail";
import { SITE_NAME } from "@/shared/seo/site-metadata";

type ArticlePageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return publishedArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return {};
  const canonicalUrl = getAbsoluteSiteUrl(`/blog/${article.slug}`);
  return {
    title: article.seoTitle,
    description: article.metaDescription,
    keywords: article.tags,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "article",
      siteName: SITE_NAME,
      title: article.seoTitle,
      description: article.metaDescription,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      locale: "vi_VN",
      url: canonicalUrl,
    },
    twitter: {
      card: "summary",
      title: article.seoTitle,
      description: article.metaDescription,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  return <ArticleDetail article={article} />;
}
