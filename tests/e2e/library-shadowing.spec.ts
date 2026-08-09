import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apiOrigin = "http://localhost:3005/api/v1";
const session = JSON.stringify({
  email: "learner@example.com",
  accessToken: "englishpath.local.learner",
});
const state = {
  item: {
    versionId: "shadow-version",
    title: "Shadowing lesson",
    summary: "Repeat a short workplace sentence.",
    taxonomy: { level: "B1", topic: "Workplace", relatedSkills: ["Listening"] },
    durationSeconds: 30,
    transcript: [
      { startSeconds: 0, endSeconds: 10, text: "Repeat this sentence" },
    ],
    media: { state: "PENDING" },
  },
  progress: null,
  bookmarks: [],
  note: null,
};
const shadowing = {
  item: state.item,
  attempt: null,
  history: [],
};

test.describe("learner library shadowing", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (value) => window.localStorage.setItem("englishpath.session", value),
      session,
    );
  });

  test("supports segment navigation, local-only progress, finalization, mobile layout, and accessibility", async ({
    page,
  }) => {
    const requestBodies: string[] = [];
    await page.route(
      `${apiOrigin}/library/items/shadow-version/**`,
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
        if (
          url.pathname.endsWith("/shadowing") &&
          route.request().method() === "GET"
        )
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ data: shadowing }),
          });
        if (route.request().method() !== "GET")
          requestBodies.push(route.request().postData() ?? "");
        const finalized = url.pathname.endsWith("/finalize");
        return route.fulfill({
          status: finalized ? 201 : 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              attemptKey: "attempt-key",
              segmentIndex: 0,
              positionSeconds: finalized ? 10 : 0,
              status: finalized ? "finalized" : "paused",
              selfRating: 4,
              finalizedAt: finalized ? "2026-01-01T00:00:00.000Z" : null,
            },
          }),
        });
      },
    );

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/library/shadow-version");
    await expect(
      page.getByRole("heading", { name: "Shadowing practice" }),
    ).toBeVisible();
    await expect(page.getByText("Lesson audio is unavailable")).toBeVisible();
    await page.getByRole("button", { name: "Save and resume later" }).click();
    await page.getByRole("button", { name: "Submit attempt" }).click();
    await expect(page.getByText("Status: Submitted")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Submit attempt" }),
    ).toBeDisabled();
    expect(requestBodies.join(" ")).not.toContain("audio");
    expect(requestBodies.join(" ")).not.toContain("blob");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("shows an explicit empty state when the transcript is unavailable", async ({
    page,
  }) => {
    await page.route(
      `${apiOrigin}/library/items/shadow-version/**`,
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
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: { ...shadowing, item: { ...state.item, transcript: [] } },
          }),
        });
      },
    );
    await page.goto("/library/shadow-version");
    await expect(
      page.getByText("No transcript segments are available for shadowing yet."),
    ).toBeVisible();
  });
});
