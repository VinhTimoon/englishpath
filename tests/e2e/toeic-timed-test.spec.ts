import { expect, test, type Page } from "@playwright/test";

const apiOrigin = "http://localhost:3005/api/v1";
const meta = { correlationId: "e2e-toeic-timed", idempotencyStatus: "created" };

function questions() {
  return Array.from({ length: 20 }, (_, index) => ({
    id: `timed-version-${index + 1}`,
    questionId: `timed-question-${index + 1}`,
    prompt: `Câu hỏi bài thi ${index + 1}`,
    options: [
      { id: "A", text: "Lựa chọn A" },
      { id: "B", text: "Lựa chọn B" },
      { id: "C", text: "Lựa chọn C" },
      { id: "D", text: "Lựa chọn D" },
    ],
    part: index < 10 ? "PART_1" : "PART_5",
    questionType: "INCOMPLETE_SENTENCE",
    difficulty: "BEGINNER",
  }));
}

function activeResponse(
  sessionId = "timed-session-1",
  answered = 0,
  remainingSeconds = 1200,
) {
  return {
    data: {
      session: {
        sessionId,
        mode: "MINI",
        status: "ACTIVE",
        total: 20,
        answered,
        remainingSeconds,
        startedAt: "2026-08-06T09:00:00.000Z",
        deadlineAt: "2026-08-06T09:20:00.000Z",
      },
      questions: questions(),
    },
    meta,
  };
}

async function installSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "englishpath.session",
      JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
    );
  });
}

test.describe("TOEIC timed test learner journey", () => {
  test("starts a server-shaped MINI test and does not allow skipping", async ({
    page,
  }) => {
    await installSession(page);
    let requestBody: Record<string, unknown> | null = null;
    await page.route(`${apiOrigin}/toeic/tests/sessions`, async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeResponse()),
      });
    });
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/timed-session-1/answers`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              accepted: true,
              replayed: false,
              questionId: "timed-version-1",
              answered: 1,
              total: 20,
            },
            meta,
          }),
        }),
    );

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/toeic/test");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: /MINI/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /HALF/ })).toBeVisible();
    await page.getByRole("button", { name: "Bắt đầu bài thi" }).click();
    await expect(
      page.getByRole("heading", { name: "Câu hỏi bài thi 1" }),
    ).toBeVisible();
    expect(requestBody).toEqual({
      clientSessionId: expect.any(String),
      mode: "MINI",
    });
    await expect(
      page.getByRole("button", { name: "Ghi nhận và tiếp tục" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: /Lựa chọn A/ }).click();
    await expect(
      page.getByRole("button", { name: "Ghi nhận và tiếp tục" }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Ghi nhận và tiếp tục" }).click();
    await expect(
      page.getByRole("heading", { name: "Câu hỏi bài thi 2" }),
    ).toBeVisible();
    expect(await page.locator("main").textContent()).not.toContain(
      "correctAnswer",
    );
    expect(await page.locator("main").textContent()).not.toContain("isCorrect");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
  });

  test("resumes the stored active session at the server acknowledged position", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.test.active",
        "timed-session-1",
      );
    });
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/timed-session-1`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(activeResponse("timed-session-1", 1)),
        }),
    );
    await page.goto("/toeic/test");
    await expect(
      page.getByRole("heading", { name: "Câu hỏi bài thi 2" }),
    ).toBeVisible();
    await expect(page.getByText("Câu 2 / 20")).toBeVisible();
    await expect(page.getByText("Câu 1 / 20")).toHaveCount(0);
  });

  test("keeps an answer retryable and reconciles server expiry", async ({
    page,
  }) => {
    await installSession(page);
    let answerAttempts = 0;
    await page.route(`${apiOrigin}/toeic/tests/sessions`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeResponse("timed-session-2", 0, 1)),
      }),
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/timed-session-2/answers`,
      async (route) => {
        answerAttempts += 1;
        if (answerAttempts === 1) {
          await route.fulfill({ status: 503, body: "temporary" });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              accepted: true,
              replayed: false,
              questionId: "timed-version-1",
              answered: 1,
              total: 20,
            },
            meta,
          }),
        });
      },
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/timed-session-2/result`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              session: {
                sessionId: "timed-session-2",
                mode: "MINI",
                status: "EXPIRED",
                total: 20,
                answered: 1,
                remainingSeconds: 0,
                score: null,
              },
              questions: [],
            },
            meta,
          }),
        }),
    );
    await page.goto("/toeic/test");
    await page.getByRole("button", { name: "Bắt đầu bài thi" }).click();
    await page.getByRole("button", { name: /Lựa chọn A/ }).click();
    await page.getByRole("button", { name: "Ghi nhận và tiếp tục" }).click();
    await expect(
      page.getByText("Chưa ghi nhận được câu trả lời."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Ghi nhận và tiếp tục" }).click();
    await expect(
      page.getByRole("heading", { name: "Câu hỏi bài thi 2" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Bài thi đã hết giờ" }),
    ).toBeVisible({ timeout: 5000 });
    expect(answerAttempts).toBe(2);
  });
});
