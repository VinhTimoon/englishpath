import { expect, test } from "@playwright/test";

const questions = Array.from({ length: 10 }, (_, index) => ({
  id: `q${index + 1}`,
  skill: index < 3 ? "VOCABULARY" : index < 6 ? "GRAMMAR" : "READING",
  prompt: `Placement question ${index + 1}`,
  options: [
    { id: "a", label: `Option A ${index + 1}` },
    { id: "b", label: `Option B ${index + 1}` },
    { id: "c", label: `Option C ${index + 1}` },
  ],
}));

test("learner completes auth, onboarding, placement, and reaches dashboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  let placementSubmitted = false;
  const submissionIds: string[] = [];
  await page.route("http://localhost:3005/api/v1/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const authorization = route.request().headers().authorization;
    expect(authorization).toBe("Bearer englishpath.local.learner");
    if (path.endsWith("/auth/bootstrap")) {
      return route.fulfill({
        json: {
          data: { userId: "local-user", roles: ["FREE_USER"] },
          meta: {},
        },
      });
    }
    if (path.endsWith("/onboarding")) {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      expect(body).not.toHaveProperty("userId");
      expect(body.primaryGoal).toBe("ENGLISH_FOUNDATION");
      return route.fulfill({ json: { data: body, meta: {} } });
    }
    if (path.endsWith("/placement/questions")) {
      return route.fulfill({ json: { data: questions, meta: {} } });
    }
    if (path.endsWith("/placement/submissions")) {
      const body = route.request().postDataJSON() as {
        answers: unknown[];
        clientSubmissionId: string;
      };
      expect(body.answers).toHaveLength(10);
      submissionIds.push(body.clientSubmissionId);
      if (submissionIds.length === 1) {
        return route.fulfill({ status: 503, json: { error: "network" } });
      }
      placementSubmitted = true;
      return route.fulfill({
        status: 201,
        json: {
          data: { score: 7, total: 10, level: "UPPER_INTERMEDIATE" },
          meta: {},
        },
      });
    }
    if (path.endsWith("/placement/result")) {
      expect(placementSubmitted).toBeTruthy();
      return route.fulfill({
        json: {
          data: {
            score: 7,
            total: 10,
            level: "UPPER_INTERMEDIATE",
            skillBreakdown: {},
          },
          meta: {},
        },
      });
    }
    return route.abort();
  });

  await page.goto("/auth");
  await page.getByLabel("Email").fill("learner@example.com");
  await page.getByLabel("Mật khẩu").fill("strong-password");
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL(/\/onboarding$/);

  await page.getByRole("button", { name: "Tiếp tục đánh giá" }).click();
  await expect(page).toHaveURL(/\/placement-test$/);
  await expect(page.getByText(/answer|correct/i)).toHaveCount(0);
  for (const question of questions) {
    await page.getByLabel(question.options[0].label, { exact: true }).check();
  }
  await page.getByRole("button", { name: "Xem kết quả của tôi" }).click();
  await expect(page.getByText(/Chưa thể chấm bài/)).toBeVisible();
  await page.getByRole("button", { name: "Xem kết quả của tôi" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  expect(submissionIds).toHaveLength(2);
  expect(submissionIds[1]).toBe(submissionIds[0]);
  await expect(page.getByText("7/10")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Khá", exact: true }),
  ).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeFalsy();
});
