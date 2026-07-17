import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  getAbsoluteSiteUrl,
  getSiteOrigin,
} from "../../apps/web/src/shared/seo/site-origin";

const origin = "http://localhost:5173";
const articlePaths = [
  "/blog/7-cum-tieng-anh-giao-tiep-tu-nhien",
  "/blog/lo-trinh-10-phut-hoc-tieng-anh",
  "/blog/say-tell-speak-talk-khac-nhau",
] as const;

test.describe("public technical SEO", () => {
  test("validates the canonical-origin contract in the required runner", () => {
    const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    const previousVercel = process.env.VERCEL;

    try {
      delete process.env.NEXT_PUBLIC_SITE_URL;
      delete process.env.VERCEL;
      expect(getSiteOrigin()).toBe(origin);
      expect(getAbsoluteSiteUrl("/blog/example")).toBe(
        `${origin}/blog/example`,
      );

      process.env.NEXT_PUBLIC_SITE_URL = "https://englishpath.example";
      expect(getSiteOrigin()).toBe("https://englishpath.example");

      for (const invalidOrigin of [
        "https://englishpath.example/",
        " https://englishpath.example",
        "https://englishpath.example/path",
        "https://englishpath.example?preview=true",
        "https://englishpath.example#preview",
        "https://user:secret@englishpath.example",
        "ftp://englishpath.example",
      ]) {
        process.env.NEXT_PUBLIC_SITE_URL = invalidOrigin;
        expect(() => getSiteOrigin()).toThrow();
      }

      process.env.NEXT_PUBLIC_SITE_URL = "https://englishpath.example";
      expect(() => getAbsoluteSiteUrl("https://attacker.example")).toThrow(
        /root-relative/,
      );

      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.VERCEL = "1";
      expect(() => getSiteOrigin()).toThrow(/required for Vercel builds/);
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

  for (const [path, type] of [
    ["/", "website"],
    ["/blog", "website"],
    ...articlePaths.map((path) => [path, "article"] as const),
  ] as const) {
    test(`serves canonical social metadata for ${path}`, async ({ page }) => {
      const response = await page.goto(path, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBe(true);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        path === "/" ? origin : `${origin}${path}`,
      );
      await expect(page.locator('meta[property="og:type"]')).toHaveAttribute(
        "content",
        type,
      );
      await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
        "content",
        path === "/" ? origin : `${origin}${path}`,
      );
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        "content",
        "summary",
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    });
  }

  test("publishes one deterministic sitemap entry per real route", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);
    expect(response.headers()["content-type"]).toContain("application/xml");
    const xml = await response.text();
    const expectedUrls = [
      origin,
      `${origin}/blog`,
      ...articlePaths.map((path) => `${origin}${path}`),
    ];
    for (const url of expectedUrls) {
      expect(xml).toContain(`<loc>${url}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(expectedUrls.length);
    expect(xml).not.toMatch(/\/admin|\/api|\/auth|draft/i);
  });

  test("publishes crawl rules with the local host and sitemap", async ({
    request,
  }) => {
    const response = await request.get("/robots.txt");
    expect(response.ok()).toBe(true);
    const robots = await response.text();
    expect(robots).toContain("User-Agent: *");
    expect(robots).toContain("Allow: /");
    expect(robots).toContain(`Host: ${origin}`);
    expect(robots).toContain(`Sitemap: ${origin}/sitemap.xml`);
  });

  test("keeps public routes linked bidirectionally with valid targets", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: "Blog", exact: true }).first(),
    ).toHaveAttribute("href", "/blog");
    await page.goto("/blog");
    await expect(page.getByRole("link", { name: "Trang chủ" })).toHaveAttribute(
      "href",
      "/",
    );
    for (const path of articlePaths) {
      await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
      expect(
        (await request.get(path)).ok(),
        `${path} should be reachable`,
      ).toBe(true);
    }
    await page.goto(articlePaths[0]);
    await expect(
      page.getByRole("link", { name: "← Tất cả bài viết" }),
    ).toHaveAttribute("href", "/blog");
    await expect(
      page.getByRole("link", { name: "EnglishPath" }),
    ).toHaveAttribute("href", "/");
  });

  test("renders crawlable metadata and content without JavaScript", async ({
    browser,
  }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    try {
      await page.goto(articlePaths[1]);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${origin}${articlePaths[1]}`,
      );
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.getByRole("link", { name: "← Tất cả bài viết" }),
      ).toBeVisible();
    } finally {
      await context.close();
    }
  });

  test("keeps every public route responsive and free of blocking axe findings", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    for (const path of ["/", "/blog", ...articlePaths]) {
      await page.goto(path);
      const width = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(width.scroll).toBeLessThanOrEqual(width.client);
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.filter(({ impact }) =>
          ["serious", "critical"].includes(impact ?? ""),
        ),
      ).toEqual([]);
    }
  });
});
