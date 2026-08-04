import { expect, test } from "@playwright/test";

test("learner reviews private errors on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() =>
    localStorage.setItem(
      "englishpath.session",
      JSON.stringify({
        email: "learner@example.com",
        accessToken: "englishpath.local.learner",
      }),
    ),
  );
  await page.route(
    "http://localhost:3005/api/v1/quiz/session/summary/errors",
    async (route) => {
      expect(route.request().headers().authorization).toBe(
        "Bearer englishpath.local.learner",
      );
      await route.fulfill({
        json: {
          data: [
            {
              questionId: "p2",
              prompt: "She ___ English every day.",
              selectedOption: "a",
              correctOption: "b",
              explanation: "Use studies with she.",
            },
          ],
        },
      });
    },
  );
  await page.goto("/error-notebook");
  await expect(
    page.getByRole("heading", { name: "Những lỗi giúp bạn tiến bộ." }),
  ).toBeVisible();
  await expect(page.getByText("Use studies with she.")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
