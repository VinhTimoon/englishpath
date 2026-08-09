import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apiOrigin = "http://localhost:3005/api/v1";
const session = JSON.stringify({
  email: "learner@example.com",
  accessToken: "englishpath.local.learner",
});
const state = {
  item: {
    versionId: "player-version",
    title: "Player lesson",
    summary: "Safe lesson",
    taxonomy: { level: "B1", topic: "Workplace", relatedSkills: ["Listening"] },
    durationSeconds: 60,
    transcript: [{ startSeconds: 0, endSeconds: 5, text: "First line" }],
    media: { state: "PENDING" },
  },
  progress: { positionSeconds: 12, status: "in_progress", version: 1 },
  bookmarks: [],
  note: null,
};

test.describe("learner library player", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (value) => window.localStorage.setItem("englishpath.session", value),
      session,
    );
  });

  test("renders unavailable media, server resume, bookmark, note, and mobile accessibility", async ({
    page,
  }) => {
    const writes: string[] = [];
    await page.route(
      `${apiOrigin}/library/items/player-version/**`,
      async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname.endsWith("/state"))
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: state }),
          });
        if (url.pathname.endsWith("/drill"))
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: null }),
          });
        if (url.pathname.endsWith("/shadowing"))
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              data: { item: state.item, attempt: null, history: [] },
            }),
          });
        writes.push(`${route.request().method()} ${url.pathname}`);
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data:
              route.request().method() === "PUT" &&
              url.pathname.endsWith("/note")
                ? {
                    body: "Learner note",
                    updatedAt: "2026-01-01T00:00:00.000Z",
                  }
                : route.request().method() === "POST"
                  ? { timestampSeconds: 0 }
                  : state.progress,
          }),
        });
      },
    );

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/library/player-version");
    await expect(
      page.getByRole("heading", { name: "Player lesson" }),
    ).toBeVisible();
    await expect(page.getByText("Media: PENDING")).toBeVisible();
    await expect(page.getByText("Tiếp tục từ 12s")).toBeVisible();
    await page.getByRole("button", { name: "Đánh dấu tại 0 giây" }).click();
    await page.getByLabel("Ghi chú riêng của bạn").fill("Learner note");
    await page.getByRole("button", { name: "Lưu ghi chú" }).click();
    await expect(page.getByLabel("Ghi chú riêng của bạn")).toHaveValue(
      "Learner note",
    );
    expect(writes).toEqual(
      expect.arrayContaining([
        "POST /api/v1/library/items/player-version/bookmarks",
        "PUT /api/v1/library/items/player-version/note",
      ]),
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("offers retry for unavailable item state", async ({ page }) => {
    let attempts = 0;
    await page.route(
      `${apiOrigin}/library/items/player-version/state`,
      async (route) => {
        attempts += 1;
        if (attempts === 1)
          return route.fulfill({ status: 503, body: "temporary" });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: state }),
        });
      },
    );
    await page.goto("/library/player-version");
    await expect(
      page.getByRole("alert").filter({ hasText: "Không thể tải nội dung" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Thử lại" }).click();
    await expect(
      page.getByRole("heading", { name: "Player lesson" }),
    ).toBeVisible();
    expect(attempts).toBe(2);
  });
});
