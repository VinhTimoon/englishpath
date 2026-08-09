import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apiOrigin = "http://localhost:3005/api/v1";
const session = JSON.stringify({
  email: "learner@example.com",
  accessToken: "englishpath.local.learner",
});
const meta = {
  correlationId: "e2e-library-catalog",
  idempotencyStatus: "not_applicable",
};

const catalogue = {
  status: "success" as const,
  items: [
    {
      itemId: "library-1",
      versionId: "library-1-v1",
      title: "Workplace dialogue",
      summary: "Practice a short meeting conversation.",
      taxonomy: {
        level: "B1",
        topic: "Workplace",
        relatedSkills: ["Listening"],
      },
      contentType: "listening",
      durationMinutes: 8,
      level: "B1",
      availability: "available" as const,
    },
    {
      itemId: "library-2",
      versionId: "library-2-v1",
      title: "Travel dialogue",
      summary: "Practice a useful airport conversation.",
      taxonomy: {
        level: "B2",
        topic: "Travel",
        relatedSkills: ["Listening"],
      },
      contentType: "listening",
      durationMinutes: 10,
      level: "B2",
      availability: "available" as const,
    },
  ],
  facets: {
    levels: ["B1", "B2"],
    topics: ["Travel", "Workplace"],
    contentTypes: ["listening"],
  },
  pagination: { page: 1, size: 1, total: 2, pages: 2 },
};

function envelope(data: unknown) {
  return JSON.stringify({ data, meta });
}

test.describe("learner library catalogue", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem("englishpath.session", value);
    }, session);
  });

  test("renders safe results, keeps URL filters, paginates, and stays accessible on mobile", async ({
    page,
  }) => {
    const requests: string[] = [];
    await page.route(`${apiOrigin}/library/catalogue**`, (route) => {
      const url = new URL(route.request().url());
      expect(route.request().headers().authorization).toBe(
        "Bearer englishpath.local.learner",
      );
      requests.push(url.search);
      const pageNumber = Number(url.searchParams.get("page") ?? "1");
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: envelope({
          ...catalogue,
          items: [catalogue.items[pageNumber - 1]],
          pagination: { ...catalogue.pagination, page: pageNumber },
        }),
      });
    });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/library");
    await expect(
      page.getByRole("heading", { name: "Workplace dialogue" }),
    ).toBeVisible();
    await expect(page.getByText("private-source-reference")).toHaveCount(0);
    await page.getByLabel("Tìm kiếm").fill("workplace");
    await page.getByRole("button", { name: "Lọc" }).click();
    await expect(page).toHaveURL(/search=workplace/);
    await page.getByRole("button", { name: "2" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      page.getByRole("heading", { name: "Travel dialogue" }),
    ).toBeVisible();
    expect(requests.some((query) => query.includes("page=2"))).toBeTruthy();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("distinguishes catalogue empty and filtered-empty states", async ({
    page,
  }) => {
    await page.route(`${apiOrigin}/library/catalogue**`, (route) => {
      const hasFilter = new URL(route.request().url()).searchParams.has(
        "search",
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: envelope({
          ...catalogue,
          status: hasFilter ? "filtered-empty" : "empty",
          items: [],
          pagination: { page: 1, size: 12, total: 0, pages: 0 },
        }),
      });
    });

    await page.goto("/library");
    await expect(page.getByRole("status")).toContainText("Thư viện");
    await page.getByLabel("Tìm kiếm").fill("missing");
    await page.getByRole("button", { name: "Lọc" }).click();
    await expect(page.getByRole("status")).toContainText("Không tìm thấy");
    await expect(page.getByRole("link", { name: "Xóa bộ lọc" })).toBeVisible();
  });

  test("offers retry for unavailable catalogue data", async ({ page }) => {
    let attempts = 0;
    await page.route(`${apiOrigin}/library/catalogue**`, (route) => {
      attempts += 1;
      if (attempts === 1)
        return route.fulfill({ status: 503, body: "temporary" });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: envelope({ ...catalogue, items: [catalogue.items[0]] }),
      });
    });

    await page.goto("/library");
    await expect(
      page.getByRole("alert").filter({ hasText: "chưa khả dụng" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Thử lại" }).click();
    await expect(
      page.getByRole("heading", { name: "Workplace dialogue" }),
    ).toBeVisible();
  });

  test("does not expose a catalogue to a guest session", async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.removeItem("englishpath.session");
    });
    await page.goto("/library");
    await expect(
      page.getByRole("alert").filter({ hasText: "Đăng nhập" }),
    ).toBeVisible();
  });
});
