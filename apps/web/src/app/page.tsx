import type { Metadata } from "next";
import { PublicHome } from "@/widgets/public-home/public-home";
import { getSiteOrigin } from "@/shared/seo/site-origin";
import {
  HOME_DESCRIPTION,
  HOME_TITLE,
  SITE_LOCALE,
  SITE_NAME,
} from "@/shared/seo/site-metadata";

const homeUrl = getSiteOrigin();

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  alternates: { canonical: homeUrl },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: SITE_LOCALE,
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    url: homeUrl,
  },
  twitter: {
    card: "summary",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

export default function Home() {
  return <PublicHome />;
}
