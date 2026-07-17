import type { Metadata } from "next";
import { getAbsoluteSiteUrl } from "@/entities/article/config/site-origin";
import { BlogIndex } from "@/widgets/public-blog/blog-index";

export const metadata: Metadata = {
  title: "EnglishPath Journal | Học tiếng Anh thực tế mỗi ngày",
  description:
    "Bài viết tiếng Việt về giao tiếp, ngữ pháp và lộ trình học tiếng Anh có ví dụ thực tế.",
  alternates: { canonical: getAbsoluteSiteUrl("/blog") },
};

export default function BlogPage() {
  return <BlogIndex />;
}
