import type { MetadataRoute } from "next";
import { publishedArticles } from "@/entities/article/model/articles";
import { getAbsoluteSiteUrl, getSiteOrigin } from "@/shared/seo/site-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const latestUpdate = publishedArticles
    .map(({ updatedAt }) => updatedAt)
    .sort()
    .at(-1);
  return [
    {
      url: getSiteOrigin(),
      lastModified: latestUpdate,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: getAbsoluteSiteUrl("/blog"),
      lastModified: latestUpdate,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: getAbsoluteSiteUrl("/vocabulary"),
      lastModified: latestUpdate,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...publishedArticles.map(({ slug, updatedAt }) => ({
      url: getAbsoluteSiteUrl(`/blog/${slug}`),
      lastModified: updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
