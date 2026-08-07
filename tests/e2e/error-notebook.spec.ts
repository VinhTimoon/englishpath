import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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
  await page.route("**/api/v1/quiz/session/summary/errors**", async (route) => {
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
  });
  await page.goto("/error-notebook");
  await expect(
    page.getByRole("heading", { name: "Những lỗi giúp bạn tiến bộ." }),
  ).toBeVisible();
  await expect(page.getByText("Use studies with she.")).toBeVisible();
  const remediation = page.getByRole("link", { name: "Xem lại lỗi" });
  await remediation.focus();
  await expect(remediation).toBeFocused();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});

test("learner can filter TOEIC errors and paginate the bounded notebook", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "englishpath.session",
      JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
    ),
  );
  await page.route("**/api/v1/quiz/session/summary/errors**", async (route) => {
    expect(new URL(route.request().url()).search).toBe(
      "?page=1&size=20&source=TOEIC_TIMED_TEST",
    );
    await route.fulfill({
      json: {
        data: {
          entries: [
            {
              questionId: "toeic-1",
              prompt: "The meeting starts at nine.",
              selectedOption: "B",
              correctOption: "A",
              explanation: "Review the time expression.",
              source: "TOEIC_TIMED_TEST",
              remediation: {
                href: "/error-notebook?source=TOEIC_TIMED_TEST",
                label: "Ôn lỗi TOEIC",
              },
            },
          ],
          pagination: { page: 1, size: 20, total: 21, hasNext: true },
        },
      },
    });
  });
  await page.goto("/error-notebook?source=TOEIC_TIMED_TEST");
  await expect(page.getByText("TOEIC", { exact: true })).toBeVisible();
  await expect(page.getByText("Ôn lỗi TOEIC")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sau" })).toBeEnabled();
});

test("shows an explicit empty Error Notebook state", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "englishpath.session",
      JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
    ),
  );
  await page.route("**/api/v1/quiz/session/summary/errors**", (route) =>
    route.fulfill({
      json: {
        data: {
          entries: [],
          pagination: { page: 1, size: 20, total: 0, hasNext: false },
        },
      },
    }),
  );
  await page.goto("/error-notebook");
  await expect(page.getByText("Chưa có lỗi nào cần xem lại.")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Bắt đầu luyện tập" }),
  ).toBeVisible();
});

test("shows a retryable Error Notebook error state", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "englishpath.session",
      JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
    ),
  );
  await page.route("**/api/v1/quiz/session/summary/errors**", (route) =>
    route.fulfill({ status: 503, body: "temporary" }),
  );
  await page.goto("/error-notebook");
  const retry = page.getByRole("button", { name: "Thử lại" });
  await expect(retry).toBeVisible();
  await retry.focus();
  await expect(retry).toBeFocused();
  await retry.press("Enter");
  await expect(page.locator('main [role="alert"]')).toContainText(
    "Chưa thể tải sổ lỗi.",
  );
});
