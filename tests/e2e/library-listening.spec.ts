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
    title: "Listening lesson",
    summary: "Safe lesson",
    taxonomy: { level: "B1", topic: "Workplace", relatedSkills: ["Listening"] },
    durationSeconds: 60,
    transcript: [],
    media: { state: "PENDING" },
  },
  progress: null,
  bookmarks: [],
  note: null,
};
const drill = {
  drillId: "library-listening-1",
  versionId: "player-version",
  questionId: "library-listening-1-question-1",
  prompt: "Which workplace action is mentioned in the lesson?",
  options: [
    { id: "option-a", label: "Review the meeting notes" },
    { id: "option-b", label: "Book a flight" },
  ],
};

test.describe("learner library listening drill", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (value) => window.localStorage.setItem("englishpath.session", value),
      session,
    );
  });

  test("keeps the drill redacted, supports keyboard submission, and shows result accessibly", async ({
    page,
  }) => {
    await page.route(
      `${apiOrigin}/library/items/player-version/state`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: state }),
        }),
    );
    await page.route(
      `${apiOrigin}/library/items/player-version/drill`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: drill }),
        }),
    );
    await page.route(
      `${apiOrigin}/library/items/player-version/drill/submit`,
      (route) =>
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              questionId: drill.questionId,
              selectedOptionId: "option-a",
              isCorrect: true,
              score: 1,
              completedAt: "2026-01-01T00:00:00.000Z",
            },
          }),
        }),
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/library/player-version");
    await expect(
      page.getByRole("heading", { name: "Bài luyện nghe" }),
    ).toBeVisible();
    await expect(page.getByText("correctOptionId")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Review the meeting notes" })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByRole("button", { name: "Nộp đáp án" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: "Điểm: 1" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Book a flight" }),
    ).toBeDisabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("renders an explicit empty state", async ({ page }) => {
    await page.route(
      `${apiOrigin}/library/items/player-version/state`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: state }),
        }),
    );
    await page.route(
      `${apiOrigin}/library/items/player-version/drill**`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: null }),
        }),
    );
    await page.goto("/library/player-version");
    await expect(
      page.getByRole("status").filter({ hasText: "Chưa có bài luyện nghe" }),
    ).toBeVisible();
  });
});
