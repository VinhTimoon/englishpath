import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apiOrigin = "http://localhost:3005/api/v1";
const session = JSON.stringify({
  email: "learner@example.com",
  accessToken: "englishpath.local.learner",
});
const state = {
  item: {
    versionId: "links-version",
    title: "Links lesson",
    summary: "Find the next approved activity.",
    taxonomy: { level: "B1", topic: "Workplace", relatedSkills: ["Listening"] },
    durationSeconds: 10,
    transcript: [{ startSeconds: 0, endSeconds: 5, text: "A safe sentence" }],
    media: { state: "PENDING" },
  },
  progress: null,
  bookmarks: [],
  note: null,
};

test.describe("library related-learning links", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (value) => window.localStorage.setItem("englishpath.session", value),
      session,
    );
  });

  test("renders safe links, preserves return context, and stays accessible on mobile", async ({
    page,
  }) => {
    await page.route(
      `${apiOrigin}/library/items/links-version/**`,
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
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              status: "success",
              versionId: "links-version",
              links: [
                {
                  kind: "roadmap",
                  label: "Today roadmap",
                  href: "/roadmap?returnVersionId=links-version",
                },
                {
                  kind: "vocabulary",
                  label: "Related vocabulary",
                  href: "/vocabulary?returnVersionId=links-version",
                },
                {
                  kind: "quiz",
                  label: "Practice quiz",
                  href: "/daily-practice?returnVersionId=links-version",
                },
              ],
            },
          }),
        });
      },
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/library/links-version");
    await expect(
      page.getByRole("heading", { name: "Related learning" }),
    ).toBeVisible();
    const links = page
      .getByRole("navigation", { name: "Related learning activities" })
      .getByRole("link");
    await expect(links).toHaveCount(3);
    await expect(links.nth(0)).toHaveAttribute(
      "href",
      "/roadmap?returnVersionId=links-version",
    );
    await expect(links.nth(1)).toHaveAttribute(
      "href",
      "/vocabulary?returnVersionId=links-version",
    );
    await expect(links.nth(2)).toHaveAttribute(
      "href",
      "/daily-practice?returnVersionId=links-version",
    );
    await links.nth(0).focus();
    await expect(links.nth(0)).toBeFocused();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("supports retry and explicit empty state", async ({ page }) => {
    let attempts = 0;
    await page.route(
      `${apiOrigin}/library/items/links-version/**`,
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
        attempts += 1;
        if (attempts === 1)
          return route.fulfill({ status: 500, body: "temporary" });
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { status: "empty", versionId: "links-version", links: [] },
          }),
        });
      },
    );
    await page.goto("/library/links-version");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "Related learning could not be loaded" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry related learning" }).click();
    await expect(
      page.getByText("No related learning activities are available yet."),
    ).toBeVisible();
    expect(attempts).toBe(2);
  });
});
