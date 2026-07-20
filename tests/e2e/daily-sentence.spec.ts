import { expect, test } from "@playwright/test";

test("learner can navigate, submit by keyboard, and revisit feedback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "englishpath.session",
      JSON.stringify({ email: "learner@example.com", accessToken: "englishpath.local.learner" }),
    );
  });

  let completed = false;
  await page.route("http://localhost:3000/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/placement/result")) {
      return route.fulfill({
        json: { data: { score: 7, total: 10, level: "INTERMEDIATE", skillBreakdown: {} }, meta: {} },
      });
    }
    if (path.endsWith("/daily-sentences/today")) {
      return route.fulfill({
        json: {
          data: completed
            ? {
                localDate: "2026-07-20",
                sentence: { id: "ds-001", prompt: "I set aside ten minutes to read every morning." },
                completed: true,
                feedback: { isCorrect: true, message: "Correct", completedAt: "2026-07-20T00:00:00.000Z" },
              }
            : {
                localDate: "2026-07-20",
                sentence: { id: "ds-001", prompt: "I set aside ten minutes to read every morning." },
                completed: false,
              },
          meta: {},
        },
      });
    }
    if (path.endsWith("/daily-sentences/ds-001/submit")) {
      const body = route.request().postDataJSON() as { answer: string };
      expect(body.answer).toBe("I set aside ten minutes to read every morning");
      completed = true;
      return route.fulfill({
        json: {
          data: {
            localDate: "2026-07-20",
            sentence: { id: "ds-001", prompt: "I set aside ten minutes to read every morning." },
            completed: true,
            feedback: { isCorrect: true, message: "Correct", completedAt: "2026-07-20T00:00:00.000Z" },
          },
          meta: {},
        },
      });
    }
    return route.abort();
  });

  await page.goto("/dashboard");
  await page.locator('a[href="/daily-sentence"]').click();
  await expect(page).toHaveURL(/\/daily-sentence$/);
  await expect(page.getByText("I set aside ten minutes to read every morning.")).toBeVisible();
  await page.getByLabel("Viết lại câu tiếng Anh").fill("I set aside ten minutes to read every morning");
  await page.getByLabel("Viết lại câu tiếng Anh").press("Enter");
  await expect(page.getByText("Correct")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Correct")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBeFalsy();
});
