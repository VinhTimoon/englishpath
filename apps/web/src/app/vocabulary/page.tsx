import type { Metadata } from "next";
import { getAbsoluteSiteUrl } from "@/shared/seo/site-origin";
import { SITE_LOCALE, SITE_NAME } from "@/shared/seo/site-metadata";
import { PublicVocabularyPage } from "@/widgets/public-vocabulary/public-vocabulary-page";

const title = "Bản đồ từ vựng tiếng Anh";
const description =
  "Khám phá cây chủ đề và sáu cấp độ từ vựng EnglishPath cho giao tiếp, công việc và TOEIC.";
const url = getAbsoluteSiteUrl("/vocabulary");

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    title,
    description,
    url,
  },
  twitter: { card: "summary", title, description },
};

export default function VocabularyPage() {
  return <PublicVocabularyPage />;
}
