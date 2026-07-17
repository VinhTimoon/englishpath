import test from "node:test";
import assert from "node:assert/strict";

import { getAbsoluteSiteUrl, getSiteOrigin } from "./site-origin.ts";

test("site origin supports local development and configured deployments", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const previousVercel = process.env.VERCEL;

  try {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL;
    assert.equal(getSiteOrigin(), "http://localhost:3000");
    assert.equal(
      getAbsoluteSiteUrl("/blog/example"),
      "http://localhost:3000/blog/example",
    );

    process.env.NEXT_PUBLIC_SITE_URL = "https://englishpath.example/";
    assert.equal(getSiteOrigin(), "https://englishpath.example");
    assert.equal(
      getAbsoluteSiteUrl("/blog/example"),
      "https://englishpath.example/blog/example",
    );

    process.env.NEXT_PUBLIC_SITE_URL = "https://englishpath.example/path";
    assert.throws(() => getSiteOrigin(), /scheme and host/);

    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL = "1";
    assert.throws(() => getSiteOrigin(), /required for Vercel builds/);
  } finally {
    if (previousSiteUrl === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_URL;
    } else {
      process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
    }
    if (previousVercel === undefined) {
      delete process.env.VERCEL;
    } else {
      process.env.VERCEL = previousVercel;
    }
  }
});
