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
