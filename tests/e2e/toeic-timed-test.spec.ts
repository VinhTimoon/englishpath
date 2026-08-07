import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const apiOrigin = "http://localhost:3005/api/v1";
const meta = { correlationId: "e2e-toeic-timed", idempotencyStatus: "created" };

function questions(total = 20) {
  return Array.from({ length: total }, (_, index) => ({
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
  mode: "MINI" | "HALF" = "MINI",
) {
  const total = mode === "MINI" ? 20 : 50;
  return {
    data: {
      session: {
        sessionId,
        mode,
        status: "ACTIVE",
        total,
        answered,
        remainingSeconds,
        startedAt: "2026-08-06T09:00:00.000Z",
        deadlineAt: `2026-08-06T09:${mode === "MINI" ? "20" : "45"}:00.000Z`,
      },
      questions: questions(total),
    },
    meta,
  };
}

function analysisResponse(
  remediation = {
    status: "ready",
    count: 3,
    href: "/error-notebook?source=TOEIC_TIMED_TEST",
  },
) {
  return {
    data: {
      analysis: {
        score: { correct: 17, total: 20, answered: 20 },
        accuracy: 85,
        skills: [
          {
            skill: "LISTENING",
            total: 10,
            answered: 10,
            correct: 9,
            accuracy: 90,
          },
          {
            skill: "READING",
            total: 10,
            answered: 10,
            correct: 8,
            accuracy: 80,
          },
        ],
        parts: [
          { part: "PART_1", total: 1, answered: 1, correct: 1, accuracy: 100 },
          { part: "PART_2", total: 2, answered: 2, correct: 1, accuracy: 50 },
        ],
        weaknesses: [
          { scope: "part", name: "Part 2", accuracy: 50, answered: 2 },
        ],
        time: {
          limitSeconds: 1200,
          usedSeconds: 900,
          remainingSeconds: 300,
          averageSecondsPerAnswered: 45,
        },
      },
      remediation,
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
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.getByRole("button", { name: "Bắt đầu bài thi" }).click();
    await expect(
      page.getByRole("heading", { name: "Câu hỏi bài thi 1" }),
    ).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
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

  test("uses the HALF mode sent to the server and tolerates malformed stored IDs", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem("englishpath.toeic.test.active", "bad");
    });
    let requestBody: Record<string, unknown> | null = null;
    await page.route(`${apiOrigin}/toeic/tests/sessions`, async (route) => {
      requestBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeResponse("half-session", 0, 2700, "HALF")),
      });
    });
    await page.goto("/toeic/test");
    await expect(page.getByRole("button", { name: /HALF/ })).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("englishpath.toeic.test.active"),
        ),
      )
      .toBeNull();
    await page.getByRole("button", { name: /HALF/ }).click();
    await page.getByRole("button", { name: "Bắt đầu bài thi" }).click();
    await expect(page.getByText("Câu 1 / 50")).toBeVisible();
    expect(requestBody).toEqual({
      clientSessionId: expect.any(String),
      mode: "HALF",
    });
  });

  test("prevents duplicate starts while the server request is pending", async ({
    page,
  }) => {
    await installSession(page);
    let starts = 0;
    await page.route(`${apiOrigin}/toeic/tests/sessions`, async (route) => {
      starts += 1;
      await new Promise((resolve) => setTimeout(resolve, 250));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeResponse()),
      });
    });
    await page.goto("/toeic/test");
    const startButton = page.getByRole("button", {
      name: /Bắt đầu bài thi|Đang mở bài/,
    });
    await startButton.click();
    await expect(startButton).toBeDisabled();
    await expect(
      page.getByRole("heading", { name: "Câu hỏi bài thi 1" }),
    ).toBeVisible();
    expect(starts).toBe(1);
  });

  test("rejects recursive forbidden fields and keeps a retryable error state", async ({
    page,
  }) => {
    await installSession(page);
    await page.route(`${apiOrigin}/toeic/tests/sessions`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...activeResponse(),
          data: {
            ...activeResponse().data,
            questions: [
              { ...questions(20)[0], metadata: { correctAnswer: "A" } },
            ],
          },
        }),
      }),
    );
    await page.goto("/toeic/test");
    await page.getByRole("button", { name: "Bắt đầu bài thi" }).click();
    await expect(page.getByText("Chưa mở được bài thi.")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Bắt đầu bài thi" }),
    ).toBeEnabled();
  });

  test("retries a resume request without losing the valid stored session", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.test.active",
        "resume-session",
      );
    });
    let attempts = 0;
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/resume-session`,
      async (route) => {
        attempts += 1;
        if (attempts === 1) {
          await route.fulfill({ status: 503, body: "temporary" });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(activeResponse("resume-session", 1)),
        });
      },
    );
    await page.goto("/toeic/test");
    await expect(
      page.getByRole("heading", { name: "Chưa khôi phục được bài thi" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Thử khôi phục lại" }).click();
    await expect(
      page.getByRole("heading", { name: "Câu hỏi bài thi 2" }),
    ).toBeVisible();
    expect(attempts).toBe(2);
  });

  test("maps explicit submit to the server and renders the submitted aggregate", async ({
    page,
  }) => {
    await installSession(page);
    let submitMethod = "";
    let submitBody: string | null = "not-checked";
    await page.route(`${apiOrigin}/toeic/tests/sessions`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(activeResponse("complete-session", 20)),
      }),
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/complete-session/submit`,
      async (route) => {
        submitMethod = route.request().method();
        submitBody = route.request().postData();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              session: {
                sessionId: "complete-session",
                mode: "MINI",
                status: "SUBMITTED",
                total: 20,
                answered: 20,
                remainingSeconds: 0,
                score: 14,
              },
            },
            meta,
          }),
        });
      },
    );
    await page.goto("/toeic/test");
    await page.getByRole("button", { name: "Bắt đầu bài thi" }).click();
    await page.getByRole("button", { name: "Nộp bài" }).click();
    await expect(
      page.getByRole("heading", { name: "Kết quả bài thi" }),
    ).toBeVisible();
    expect(submitMethod).toBe("POST");
    expect(submitBody).toBeNull();
  });

  test("keeps a conflict actionable and does not reopen a finalized session", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.test.active",
        "final-session",
      );
    });
    await page.route(`${apiOrigin}/toeic/tests/sessions`, (route) =>
      route.fulfill({ status: 409, body: "conflict" }),
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/final-session`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              session: {
                sessionId: "final-session",
                mode: "MINI",
                status: "EXPIRED",
                total: 20,
                answered: 5,
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
    await expect(
      page.getByRole("heading", { name: "Bài thi đã hết giờ" }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() =>
          window.localStorage.getItem("englishpath.toeic.test.active"),
        ),
      )
      .toBeNull();
    await page.getByRole("button", { name: "Làm bài mới" }).click();
    await page.getByRole("button", { name: "Bắt đầu bài thi" }).click();
    await expect(
      page.getByText("Bài thi đã thay đổi trạng thái."),
    ).toBeVisible();
  });

  test("renders a safe submitted aggregate and passes the accessibility smoke check", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.test.active",
        "submitted-session",
      );
    });
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/submitted-session`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              session: {
                sessionId: "submitted-session",
                mode: "MINI",
                status: "SUBMITTED",
                total: 20,
                answered: 20,
                remainingSeconds: 0,
                score: 17,
              },
              questions: [],
            },
            meta,
          }),
        }),
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/submitted-session/analysis`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(analysisResponse()),
        }),
    );
    await page.goto("/toeic/test");
    await expect(
      page.getByRole("heading", { name: "Kết quả bài thi" }),
    ).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("17", { exact: true })).toBeVisible();
    await expect(page.getByText(/85%/)).toBeVisible();
    const remediation = page.getByRole("link", { name: "Mở sổ lỗi TOEIC" });
    await expect(remediation).toHaveAttribute(
      "href",
      "/error-notebook?source=TOEIC_TIMED_TEST",
    );
    await remediation.focus();
    await expect(remediation).toBeFocused();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.reload();
    await expect(page.getByText(/85%/)).toBeVisible();
  });

  test("keeps the final result visible while analysis retries after an error", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.test.active",
        "analysis-retry-session",
      );
    });
    let attempts = 0;
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/analysis-retry-session`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              session: {
                sessionId: "analysis-retry-session",
                mode: "MINI",
                status: "SUBMITTED",
                total: 20,
                answered: 20,
                remainingSeconds: 300,
                score: 17,
              },
              questions: [],
            },
            meta,
          }),
        }),
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/analysis-retry-session/analysis`,
      async (route) => {
        attempts += 1;
        if (attempts === 1) {
          await route.fulfill({ status: 503, body: "temporary" });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(analysisResponse()),
        });
      },
    );
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/toeic/test");
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    const analysisSection = page.locator('[class*="analysis"]').first();
    await expect(analysisSection).toContainText("phân tích");
    await analysisSection.getByRole("button").focus();
    await analysisSection.getByRole("button").press("Enter");
    await expect(page.getByText(/85%/)).toBeVisible();
    expect(attempts).toBe(2);
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test("renders an unavailable analysis state without hiding the final result", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.test.active",
        "analysis-empty-session",
      );
    });
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/analysis-empty-session`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              session: {
                sessionId: "analysis-empty-session",
                mode: "MINI",
                status: "SUBMITTED",
                total: 20,
                answered: 0,
                remainingSeconds: 0,
                score: 0,
              },
              questions: [],
            },
            meta,
          }),
        }),
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/analysis-empty-session/analysis`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { analysis: null }, meta }),
        }),
    );
    await page.goto("/toeic/test");
    await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
    const analysisSection = page.locator('[class*="analysis"]').first();
    await expect(analysisSection).toBeVisible();
    await expect(analysisSection.locator("p")).toHaveCount(1);
  });

  test("renders an unavailable remediation state without hiding analysis", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.test.active",
        "remediation-unavailable-session",
      );
    });
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/remediation-unavailable-session`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              session: {
                sessionId: "remediation-unavailable-session",
                mode: "MINI",
                status: "SUBMITTED",
                total: 20,
                answered: 20,
                remainingSeconds: 0,
                score: 12,
              },
              questions: [],
            },
            meta,
          }),
        }),
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/remediation-unavailable-session/analysis`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            analysisResponse({ status: "unavailable", count: 0, href: null }),
          ),
        }),
    );
    await page.goto("/toeic/test");
    await expect(page.getByText("Chưa xác nhận được sổ lỗi.")).toBeVisible();
    await expect(page.getByText(/85%/)).toBeVisible();
  });

  test("renders a no-errors remediation state after a clean final attempt", async ({
    page,
  }) => {
    await installSession(page);
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.test.active",
        "remediation-empty-session",
      );
    });
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/remediation-empty-session`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              session: {
                sessionId: "remediation-empty-session",
                mode: "MINI",
                status: "SUBMITTED",
                total: 20,
                answered: 20,
                remainingSeconds: 0,
                score: 20,
              },
              questions: [],
            },
            meta,
          }),
        }),
    );
    await page.route(
      `${apiOrigin}/toeic/tests/sessions/remediation-empty-session/analysis`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            analysisResponse({ status: "empty", count: 0, href: null }),
          ),
        }),
    );
    await page.goto("/toeic/test");
    await expect(
      page.getByText("Chưa có lỗi sai nào cần ôn lại từ bài thi này."),
    ).toBeVisible();
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
