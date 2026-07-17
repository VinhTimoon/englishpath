const LOCAL_SITE_ORIGIN = "http://localhost:5173";

export function getSiteOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configuredOrigin && process.env.VERCEL) {
    throw new Error("NEXT_PUBLIC_SITE_URL is required for Vercel builds.");
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
  return new URL(pathname, `${getSiteOrigin()}/`).toString();
}
