import { expect, test } from "@playwright/test";

const questions = Array.from({ length: 5 }, (_, index) => ({
  id: `p${index + 1}`,
  prompt: `Practice question ${index + 1}`,
  options: [
    { id: "a", label: `Answer A ${index + 1}` },
    { id: "b", label: `Answer B ${index + 1}` },
    { id: "c", label: `Answer C ${index + 1}` },
  ],
}));

test("learner completes five daily cards and sees progress", async ({
  page,
}) => {
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
  let answered = 0;
  await page.route("http://localhost:3000/api/v1/**", async (route) => {
    expect(route.request().headers().authorization).toBe(
      "Bearer englishpath.local.learner",
    );
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/quiz/session"))
      return route.fulfill({
        status: 201,
        json: {
          data: {
            session: {
              id: "session-001",
              status: "ACTIVE",
              score: 0,
              total: 5,
              xpAwarded: 0,
              streakDays: 0,
              errors: [],
            },
            questions,
          },
        },
      });
    if (path.endsWith("/answer")) {
      answered += 1;
      return route.fulfill({
        status: 201,
        json: {
          data: {
            session: { id: "session-001", status: "ACTIVE" },
            feedback: {
              isCorrect: answered !== 2,
              explanation:
                answered === 2 ? "Review this grammar rule." : "Good choice.",
            },
          },
        },
      });
    }
    if (path.endsWith("/submit"))
      return route.fulfill({
        status: 201,
        json: {
          data: {
            id: "session-001",
            status: "SUBMITTED",
            score: 4,
            total: 5,
            xpAwarded: 50,
            streakDays: 1,
            errors: [
              {
                questionId: "p2",
                prompt: "Practice question 2",
                explanation: "Review this grammar rule.",
              },
            ],
          },
        },
      });
    return route.abort();
  });
  await page.goto("/daily-practice");
  await expect(page.getByText(/correctOption|explanation/i)).toHaveCount(0);
  for (let index = 0; index < 5; index += 1) {
    await page.getByRole("button", { name: `Answer A ${index + 1}` }).click();
    await page
      .getByRole("button", {
        name: index === 4 ? "Xem tổng kết" : "Câu tiếp theo",
      })
      .click();
  }
  await expect(page.getByText("4/5")).toBeVisible();
  await expect(page.getByText("+50")).toBeVisible();
  await expect(page.getByText("Review this grammar rule.")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
