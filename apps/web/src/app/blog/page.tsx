import type { Metadata } from "next";
import { getAbsoluteSiteUrl } from "@/entities/article/config/site-origin";
import { BlogIndex } from "@/widgets/public-blog/blog-index";
import {
  BLOG_DESCRIPTION,
  BLOG_TITLE,
  SITE_LOCALE,
  SITE_NAME,
} from "@/shared/seo/site-metadata";

const blogUrl = getAbsoluteSiteUrl("/blog");

export const metadata: Metadata = {
  title: { absolute: BLOG_TITLE },
  description: BLOG_DESCRIPTION,
  alternates: { canonical: blogUrl },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
    url: blogUrl,
  },
  twitter: {
    card: "summary",
    title: BLOG_TITLE,
    description: BLOG_DESCRIPTION,
  },
};

export default function BlogPage() {
  return <BlogIndex />;
}
