import type { MetadataRoute } from "next";
import { getAbsoluteSiteUrl, getSiteOrigin } from "@/shared/seo/site-origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: getAbsoluteSiteUrl("/sitemap.xml"),
    host: getSiteOrigin(),
  };
}
