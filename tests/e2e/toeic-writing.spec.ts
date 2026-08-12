import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const apiOrigin = "http://localhost:3005/api/v1";
const meta = {
  correlationId: "e2e-writing",
  idempotencyStatus: "not_applicable",
};
const task = {
  id: "ep-writing-sentence-001",
  skill: "WRITING",
  taskType: "SENTENCE_BASED",
  version: "v1",
  promptKind: "TEXT",
  responseMode: "TEXT",
  instruction: "Write one clear sentence about a reliable study habit.",
  prompt: "Describe a study habit that helps you learn English.",
  minWords: 5,
  maxWords: 40,
};

function session(status: "ACTIVE" | "FINALIZED" = "ACTIVE") {
  return {
    sessionId: "writing-session-e2e",
    status,
    task,
    startedAt: "2026-08-10T00:00:00.000Z",
    finalizedAt: status === "FINALIZED" ? "2026-08-10T00:01:00.000Z" : null,
    submission:
      status === "FINALIZED"
        ? {
            submissionId: "writing-submission-e2e",
            responseMode: "TEXT",
            wordCount: 10,
            characterCount: 62,
            submittedAt: "2026-08-10T00:01:00.000Z",
          }
        : null,
  };
}

function envelope(data: unknown) {
  return { data, meta };
}

function feedbackEnvelope(
  outcome: "ALLOWED" | "PROVIDER_UNAVAILABLE" | "DENIED" = "ALLOWED",
  feedback: unknown = {
    advisoryOnly: true,
    summary: "Your message is clear and easy to follow.",
    strengths: ["The main idea is easy to understand."],
    nextSteps: ["Add one concrete supporting detail next time."],
  },
  replayed = false,
) {
  return {
    data: {
      feedback: {
        outcome,
        policyVersion: "feedback-gateway-v1",
        promptVersion: "local-fixture-v1",
        feature: "WRITING",
        skill: "WRITING",
        quotaRemaining: 9,
        feedback: outcome === "ALLOWED" ? feedback : null,
      },
      replayed,
    },
    meta: {
      correlationId: "e2e-writing-feedback",
      idempotencyStatus: replayed ? "replayed" : "created",
    },
  };
}

async function installSession(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "englishpath.session",
      JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
    );
  });
}

async function routeStart(page: Page, status = 200) {
  await page.route(
    `${apiOrigin}/toeic/writing/tasks/${task.id}/sessions`,
    async (route) => {
      if (status !== 200) return route.fulfill({ status, body: "unavailable" });
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(envelope({ session: session(), replayed: false })),
      });
    },
  );
}

test.describe("TOEIC Writing learner journey", () => {
  test("starts, writes, submits once, and shows only safe completion metadata", async ({
    page,
  }) => {
    await installSession(page);
    let startKey = "";
    let submitKey = "";
    let feedbackKey = "";
    let feedbackMethod = "";
    let feedbackRequests = 0;
    let feedbackBody: string | null = null;
    let feedbackAuthorization = "";
    let submittedBody: Record<string, unknown> | null = null;
    await page.route(
      `${apiOrigin}/toeic/writing/tasks/${task.id}/sessions`,
      async (route) => {
        startKey = route.request().headers()["idempotency-key"] ?? "";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session(), replayed: false }),
          ),
        });
      },
    );
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/submissions`,
      async (route) => {
        submitKey = route.request().headers()["idempotency-key"] ?? "";
        submittedBody = route.request().postDataJSON() as Record<
          string,
          unknown
        >;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: false }),
          ),
        });
      },
    );
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/feedback`,
      async (route) => {
        feedbackRequests += 1;
        feedbackMethod = route.request().method();
        feedbackKey = route.request().headers()["idempotency-key"] ?? "";
        feedbackBody = route.request().postData();
        feedbackAuthorization = route.request().headers().authorization ?? "";
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(feedbackEnvelope()),
        });
      },
    );

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: "Bắt đầu Writing" }).click();
    await expect(
      page.getByRole("heading", { name: task.prompt }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Câu trả lời của bạn" })
      .fill("I review new English words every morning.");
    await page.getByRole("button", { name: "Gửi bài Writing" }).click();
    await expect(
      page.getByRole("heading", { name: "Bài viết đã được lưu an toàn" }),
    ).toBeVisible();
    const feedbackButton = page.locator('[data-feedback-action="request"]');
    await feedbackButton.focus();
    await feedbackButton.press("Enter");
    await expect(
      page.getByText("Your message is clear and easy to follow."),
    ).toBeVisible();
    await expect(
      page.getByText("Add one concrete supporting detail next time."),
    ).toBeVisible();
    expect(feedbackRequests).toBe(1);
    expect(feedbackMethod).toBe("POST");
    expect(feedbackKey).toMatch(/^writing-feedback-/);
    expect(feedbackBody).toBeNull();
    expect(feedbackAuthorization).toBe("Bearer local");
    expect(startKey).toMatch(/^writing-start-/);
    expect(submitKey).toMatch(/^writing-submit-/);
    expect(submittedBody).toEqual({
      text: "I review new English words every morning.",
    });
    expect(await page.locator("body").innerText()).not.toMatch(
      /score|provider|rubric|submittedText/i,
    );
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(
      accessibility.violations.filter((violation) =>
        ["serious", "critical"].includes(violation.impact ?? ""),
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
  });

  test("keeps the finalized result when Writing feedback is unavailable and retryable", async ({
    page,
  }) => {
    await installSession(page);
    await routeStart(page);
    let submissions = 0;
    const feedbackKeys: string[] = [];
    let feedbackRequests = 0;
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/submissions`,
      async (route) => {
        submissions += 1;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: false }),
          ),
        });
      },
    );
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/feedback`,
      async (route) => {
        feedbackRequests += 1;
        feedbackKeys.push(route.request().headers()["idempotency-key"] ?? "");
        if (feedbackRequests === 1) {
          await new Promise((resolve) => setTimeout(resolve, 300));
          return route.fulfill({ status: 503, body: "temporary" });
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            feedbackEnvelope("PROVIDER_UNAVAILABLE", null, true),
          ),
        });
      },
    );

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: /Bắt đầu Writing/i }).click();
    await page
      .getByRole("textbox")
      .fill("I review new English words every morning.");
    await page.getByRole("button", { name: /Gửi bài Writing/i }).click();
    await expect(
      page.getByRole("heading", { name: /lưu an toàn/i }),
    ).toBeVisible();

    const feedbackButton = page.locator('[data-feedback-action="request"]');
    await feedbackButton.evaluate((button) => {
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    await expect(feedbackButton).toBeDisabled();
    await expect(page.getByText(/Chưa tải được phản hồi/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Thử lại phản hồi/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Thử lại phản hồi/i }).click();
    await expect(page.getByText(/chưa khả dụng/i)).toBeVisible();
    expect(feedbackRequests).toBe(2);
    expect(feedbackKeys[1]).toBe(feedbackKeys[0]);
    expect(submissions).toBe(1);
    await expect(page.getByText("10", { exact: true })).toBeVisible();
    await expect(page.getByText("62", { exact: true })).toBeVisible();
    expect(await page.locator("body").innerText()).not.toMatch(
      /provider|credential|rubric|official score|submittedText/i,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
  });

  test("fails closed for denied and malformed Writing feedback", async ({
    page,
  }) => {
    await installSession(page);
    await routeStart(page);
    const submissionBodies: Array<Record<string, unknown> | null> = [];
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/submissions`,
      (route) => {
        submissionBodies.push(
          route.request().postDataJSON() as Record<string, unknown>,
        );
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: false }),
          ),
        });
      },
    );
    let feedbackRequests = 0;
    const feedbackBodies: Array<string | null> = [];
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/feedback`,
      (route) => {
        feedbackRequests += 1;
        feedbackBodies.push(route.request().postData());
        if (feedbackRequests === 1) {
          return route.fulfill({ status: 503, body: "temporary" });
        }
        if (feedbackRequests === 2) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...feedbackEnvelope("ALLOWED", {
                advisoryOnly: true,
                summary: "Your score is 8/10.",
                strengths: ["The main idea is easy to understand."],
                nextSteps: ["Add one concrete supporting detail next time."],
              }),
            }),
          });
        }
        if (feedbackRequests === 3) {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(feedbackEnvelope("DENIED", null, false)),
          });
        }
        if (feedbackRequests === 4) {
          return route.fulfill({ status: 422, body: "invalid" });
        }
        return route.fulfill({ status: 422, body: "invalid" });
      },
    );
    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: /Bắt đầu Writing/i }).click();
    await page
      .getByRole("textbox")
      .fill("I review new English words every morning.");
    await page.getByRole("button", { name: /Gửi bài Writing/i }).click();
    await expect(
      page.getByRole("heading", { name: /lưu an toàn/i }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Nhận phản hồi hướng dẫn/i })
      .click();
    await expect(page.getByText(/Chưa tải được phản hồi/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Thử lại phản hồi/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Thử lại phản hồi/i }).click();
    await expect(
      page.locator('[data-feedback-state="validation"]'),
    ).toBeVisible();
    await page.getByRole("button", { name: /Luyện lượt mới/i }).click();
    await page.getByRole("button", { name: /Bắt đầu Writing/i }).click();
    await page
      .getByRole("textbox")
      .fill("I review new English words every morning.");
    await page.getByRole("button", { name: /Gửi bài Writing/i }).click();
    await expect(
      page.getByRole("heading", { name: /lưu an toàn/i }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Nhận phản hồi hướng dẫn/i })
      .click();
    await expect(page.locator('[data-feedback-state="denied"]')).toBeVisible();
    await expect(page.getByText("10", { exact: true })).toBeVisible();
    await expect(page.getByText("62", { exact: true })).toBeVisible();
    expect(feedbackRequests).toBe(3);
    await page.getByRole("button", { name: /Luyện lượt mới/i }).click();
    await page.getByRole("button", { name: /Bắt đầu Writing/i }).click();
    await page
      .getByRole("textbox")
      .fill("I review new English words every morning.");
    await page.getByRole("button", { name: /Gửi bài Writing/i }).click();
    await expect(
      page.getByRole("heading", { name: /lưu an toàn/i }),
    ).toBeVisible();
    await page.locator('[data-feedback-action="request"]').click();
    await expect(
      page.locator('[data-feedback-state="validation"]'),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /lưu an toàn/i }),
    ).toBeVisible();
    expect(feedbackRequests).toBe(4);
    expect(feedbackBodies).toEqual([null, null, null, null]);
    expect(submissionBodies).toEqual([
      { text: "I review new English words every morning." },
      { text: "I review new English words every morning." },
      { text: "I review new English words every morning." },
    ]);
    expect(await page.locator("body").innerText()).not.toContain("8/10");
  });

  test("ignores a late feedback response after starting a new attempt", async ({
    page,
  }) => {
    await installSession(page);
    await routeStart(page);
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/submissions`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: false }),
          ),
        }),
    );
    let releaseFeedback!: () => void;
    const feedbackReleased = new Promise<void>((resolve) => {
      releaseFeedback = resolve;
    });
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/feedback`,
      async (route) => {
        await feedbackReleased;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(feedbackEnvelope()),
        });
      },
    );

    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: /Bắt đầu Writing/i }).click();
    await page
      .getByRole("textbox")
      .fill("I review new English words every morning.");
    await page.getByRole("button", { name: /Gửi bài Writing/i }).click();
    await expect(
      page.getByRole("heading", { name: /lưu an toàn/i }),
    ).toBeVisible();
    await page.locator('[data-feedback-action="request"]').click();
    await expect(page.locator('[data-feedback-state="loading"]')).toBeVisible();

    await page.getByRole("button", { name: /Luyện lượt mới/i }).click();
    await page.getByRole("button", { name: /Bắt đầu Writing/i }).click();
    await expect(
      page.getByRole("heading", { name: task.prompt }),
    ).toBeVisible();
    releaseFeedback();
    await page.waitForTimeout(50);
    await expect(
      page.getByRole("heading", { name: task.prompt }),
    ).toBeVisible();
    await expect(page.locator('[data-feedback-state="success"]')).toHaveCount(
      0,
    );
  });

  test("shows an explicit unavailable state when the approved task is missing", async ({
    page,
  }) => {
    await installSession(page);
    await routeStart(page, 404);
    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: "Bắt đầu Writing" }).click();
    await expect(
      page.getByRole("heading", { name: "Bài Writing chưa sẵn sàng" }),
    ).toBeVisible();
    await expect(
      page.locator("section").getByRole("link", { name: "Về dashboard" }),
    ).toBeVisible();
  });

  test("keeps the answer after validation failure and reuses the same submit request boundary", async ({
    page,
  }) => {
    await installSession(page);
    await routeStart(page);
    let submissions = 0;
    const submitKeys: string[] = [];
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/submissions`,
      async (route) => {
        submissions += 1;
        submitKeys.push(route.request().headers()["idempotency-key"] ?? "");
        if (submissions === 1)
          return route.fulfill({ status: 422, body: "invalid" });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: true }),
          ),
        });
      },
    );
    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: "Bắt đầu Writing" }).click();
    const answer = page.getByRole("textbox", { name: "Câu trả lời của bạn" });
    await answer.fill("I review new English words every morning.");
    await page.getByRole("button", { name: "Gửi bài Writing" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("giới hạn");
    await expect(answer).toHaveValue(
      "I review new English words every morning.",
    );
    await page.getByRole("button", { name: "Gửi bài Writing" }).click();
    await expect(
      page.getByRole("heading", { name: "Bài viết đã được lưu an toàn" }),
    ).toBeVisible();
    expect(submissions).toBe(2);
    expect(submitKeys[0]).toBeTruthy();
    expect(submitKeys[1]).toBe(submitKeys[0]);
  });

  test("keeps a transient API failure retryable without losing the draft", async ({
    page,
  }) => {
    await installSession(page);
    await routeStart(page);
    let submissions = 0;
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/submissions`,
      async (route) => {
        submissions += 1;
        if (submissions === 1)
          return route.fulfill({ status: 503, body: "temporary" });
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: true }),
          ),
        });
      },
    );
    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: "Bắt đầu Writing" }).click();
    const answer = page.getByRole("textbox", { name: "Câu trả lời của bạn" });
    await answer.fill("I review new English words every morning.");
    await page.getByRole("button", { name: "Gửi bài Writing" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(
      "Chưa gửi được bài viết",
    );
    await expect(answer).toHaveValue(
      "I review new English words every morning.",
    );
    await page.getByRole("button", { name: "Gửi bài Writing" }).click();
    await expect(
      page.getByRole("heading", { name: "Bài viết đã được lưu an toàn" }),
    ).toBeVisible();
    expect(submissions).toBe(2);
  });

  test("prevents a second click while submit is pending", async ({ page }) => {
    await installSession(page);
    await routeStart(page);
    let submissions = 0;
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}/submissions`,
      async (route) => {
        submissions += 1;
        await new Promise((resolve) => setTimeout(resolve, 300));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: false }),
          ),
        });
      },
    );
    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: "Bắt đầu Writing" }).click();
    await page
      .getByRole("textbox", { name: "Câu trả lời của bạn" })
      .fill("I review new English words every morning.");
    const submit = page.getByRole("button", {
      name: /Gửi bài Writing|Đang gửi bài/,
    });
    await submit.click();
    await expect(submit).toBeDisabled();
    expect(submissions).toBe(1);
    await expect(
      page.getByRole("heading", { name: "Bài viết đã được lưu an toàn" }),
    ).toBeVisible();
  });

  test("resumes a cancelled session as an actionable conflict", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem(
        "englishpath.session",
        JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
      );
      window.localStorage.setItem(
        "englishpath.toeic.writing.attempt",
        JSON.stringify({
          taskId: "ep-writing-sentence-001",
          sessionId: "writing-session-e2e",
          startKey: "writing-start-resume",
          submitKey: "writing-submit-resume",
        }),
      );
    });
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({
              session: {
                ...session("ACTIVE"),
                status: "CANCELLED",
                submission: null,
              },
            }),
          ),
        }),
    );
    await page.goto("/toeic/writing");
    await expect(
      page.getByRole("heading", { name: "Trạng thái chưa được xác nhận" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Tải lại trạng thái" }),
    ).toBeVisible();
  });

  test("keeps a resume conflict tied to the existing session", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.localStorage.setItem(
        "englishpath.session",
        JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
      );
      window.localStorage.setItem(
        "englishpath.toeic.writing.attempt",
        JSON.stringify({
          taskId: "ep-writing-sentence-001",
          sessionId: "writing-session-e2e",
          startKey: "writing-start-conflict",
          submitKey: "writing-submit-conflict",
        }),
      );
    });
    let starts = 0;
    await page.route(
      `${apiOrigin}/toeic/writing/sessions/${session().sessionId}`,
      (route) => route.fulfill({ status: 409, body: "conflict" }),
    );
    await page.route(
      `${apiOrigin}/toeic/writing/tasks/${task.id}/sessions`,
      (route) => {
        starts += 1;
        return route.fulfill({
          status: 409,
          body: "must not start a new attempt",
        });
      },
    );
    await page.goto("/toeic/writing");
    await expect(
      page.getByRole("heading", { name: "Trạng thái chưa được xác nhận" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Tải lại trạng thái" }).click();
    expect(starts).toBe(0);
  });

  test("rejects sensitive fields in the task envelope instead of rendering them", async ({
    page,
  }) => {
    await installSession(page);
    await page.route(
      `${apiOrigin}/toeic/writing/tasks/${task.id}/sessions`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({
              session: {
                ...session(),
                task: { ...task, provider: "hidden-provider" },
              },
              replayed: false,
            }),
          ),
        }),
    );
    await page.goto("/toeic/writing");
    await page.getByRole("button", { name: "Bắt đầu Writing" }).click();
    await expect(page.locator('section[role="alert"]')).toContainText(
      "Chưa mở được bài Writing",
    );
    expect(await page.locator("body").innerText()).not.toContain(
      "hidden-provider",
    );
  });
});
