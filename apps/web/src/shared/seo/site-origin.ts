export const LOCAL_SITE_ORIGIN = "http://localhost:5173";

export function getSiteOrigin() {
  const rawOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (rawOrigin !== undefined && rawOrigin !== rawOrigin.trim()) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must not contain surrounding whitespace.",
    );
  }
  const configuredOrigin = rawOrigin || undefined;
  if (!configuredOrigin && process.env.VERCEL) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for Vercel builds.");
  }
  if (configuredOrigin?.endsWith("/")) {
    throw new Error("NEXT_PUBLIC_SITE_URL must not include a trailing slash.");
  }

  const siteOrigin = configuredOrigin || LOCAL_SITE_ORIGIN;
  let url: URL;
  try {
    url = new URL(siteOrigin);
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute http(s) origin.");
  }

  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL must contain only an http(s) scheme and host.",
    );
  }
  return url.origin;
}

export function getAbsoluteSiteUrl(pathname: string) {
  if (!pathname.startsWith("/") || pathname.startsWith("//")) {
    throw new Error("Site URL pathname must be root-relative.");
  }
  return new URL(pathname, `${getSiteOrigin()}/`).toString();
}
