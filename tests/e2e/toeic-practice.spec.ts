import { expect, test, type Page } from "@playwright/test";

const apiOrigin = "http://localhost:3005/api/v1";
const meta = {
  correlationId: "e2e-toeic",
  idempotencyStatus: "not_applicable",
};

const catalogue = {
  data: {
    listening: { parts: ["PART_1", "PART_2"], difficulties: ["BEGINNER"] },
    reading: {
      parts: ["PART_5"],
      difficulties: ["ELEMENTARY"],
      topics: ["workplace"],
    },
  },
  meta,
};

function startResponse(sessionId = "toeic-session-1") {
  return {
    data: {
      session: { sessionId, status: "ACTIVE", total: 2, answered: 0 },
      questions: [
        {
          id: "toeic-version-1",
          questionId: "toeic-question-1",
          prompt: "What is the speaker doing?",
          options: [
            { id: "A", text: "Standing" },
            { id: "B", text: "Sitting" },
          ],
          part: "PART_1",
          questionType: "PHOTO_DESCRIPTION",
          difficulty: "BEGINNER",
          mediaReference: null,
        },
        {
          id: "toeic-version-2",
          questionId: "toeic-question-2",
          prompt: "Where is the meeting?",
          options: [
            { id: "A", text: "Room one" },
            { id: "B", text: "Room two" },
          ],
          part: "PART_1",
          questionType: "PHOTO_DESCRIPTION",
          difficulty: "BEGINNER",
          mediaReference: null,
        },
      ],
    },
    meta,
  };
}

function readingStartResponse() {
  const response = startResponse("reading-session-1");
  return {
    ...response,
    data: {
      ...response.data,
      questions: response.data.questions.map((question, index) => ({
        ...question,
        id: `reading-version-${index + 1}`,
        questionId: `reading-question-${index + 1}`,
        prompt:
          index === 0 ? "The office opens at ___." : "Which room is reserved?",
        part: "PART_5",
        questionType: "INCOMPLETE_SENTENCE",
        difficulty: "ELEMENTARY",
        topic: "workplace",
      })),
    },
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

test.describe("TOEIC practice learner journey", () => {
  test.beforeEach(async ({ page }) => {
    await installSession(page);
    await page.route(`${apiOrigin}/toeic/practice/catalogue`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(catalogue),
      }),
    );
  });

  test("loads server filters, stays within 360px, and prevents skipping", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.route(
      `${apiOrigin}/toeic/practice/listening/sessions`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(startResponse()),
        }),
    );
    await page.goto("/toeic/practice");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("select").first()).toHaveValue("PART_1");
    await page.locator("button").nth(2).click();
    await expect(
      page.getByRole("heading", { name: "What is the speaker doing?" }),
    ).toBeVisible();
    await expect(page.locator("button").last()).toBeDisabled();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
  });

  test("replays an active session after refresh using the stored setup", async ({
    page,
  }) => {
    let starts = 0;
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.toeic.practice.setup",
        JSON.stringify({
          mode: "listening",
          part: "PART_1",
          difficulty: "BEGINNER",
          topic: "",
        }),
      );
    });
    await page.route(
      `${apiOrigin}/toeic/practice/listening/sessions`,
      (route) => {
        starts += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(startResponse()),
        });
      },
    );
    await page.goto("/toeic/practice");
    await expect(
      page.getByRole("heading", { name: "What is the speaker doing?" }),
    ).toBeVisible();
    expect(starts).toBe(1);
  });

  test("switches to Reading, sends server filters, and supports keyboard selection", async ({
    page,
  }) => {
    let body: Record<string, unknown> | null = null;
    await page.route(
      `${apiOrigin}/toeic/practice/reading/sessions`,
      async (route) => {
        body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(readingStartResponse()),
        });
      },
    );
    await page.route(
      `${apiOrigin}/toeic/practice/reading/sessions/reading-session-1/answers`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              accepted: true,
              replayed: false,
              questionId: "reading-question-1",
              answered: 1,
              total: 2,
            },
            meta,
          }),
        }),
    );
    await page.goto("/toeic/practice");
    await page.getByRole("button", { name: "Reading" }).click();
    await expect(page.locator("select").first()).toHaveValue("PART_5");
    const topic = page.locator("select").nth(2);
    await topic.selectOption("workplace");
    await page.locator("button").nth(2).click();
    await expect(
      page.getByRole("heading", { name: "The office opens at ___." }),
    ).toBeVisible();
    expect(body).toMatchObject({ readingPart: "PART_5", topic: "workplace" });
    expect(body).not.toHaveProperty("listeningPart");
    const option = page.getByRole("button", { name: /Standing/ });
    await option.focus();
    await option.press("Enter");
    await expect(page.locator("button").last()).toBeEnabled();
  });

  test("renders an actionable empty catalogue state", async ({ page }) => {
    await page.unroute(`${apiOrigin}/toeic/practice/catalogue`);
    await page.route(`${apiOrigin}/toeic/practice/catalogue`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            listening: { parts: [], difficulties: [] },
            reading: { parts: [], difficulties: [], topics: [] },
          },
          meta,
        }),
      }),
    );
    await page.goto("/toeic/practice");
    await expect(page.getByRole("heading", { level: 3 })).toBeVisible();
    await expect(page.locator("button").last()).toBeDisabled();
  });

  test("retries an answer, prevents duplicate submit, and shows a safe final result", async ({
    page,
  }) => {
    let answers = 0;
    await page.route(
      `${apiOrigin}/toeic/practice/listening/sessions`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(startResponse()),
        }),
    );
    await page.route(
      `${apiOrigin}/toeic/practice/listening/sessions/toeic-session-1/answers`,
      async (route) => {
        answers += 1;
        if (answers === 1)
          return route.fulfill({ status: 503, body: "temporary" });
        await new Promise((resolve) => setTimeout(resolve, 250));
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              accepted: true,
              replayed: false,
              questionId: "toeic-question-1",
              answered: 1,
              total: 2,
            },
            meta,
          }),
        });
      },
    );
    await page.route(
      `${apiOrigin}/toeic/practice/listening/sessions/toeic-session-1/submit`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              sessionId: "toeic-session-1",
              status: "SUBMITTED",
              total: 2,
              answered: 2,
              score: 2,
            },
            meta,
          }),
        }),
    );
    await page.goto("/toeic/practice");
    await page.locator("button").nth(2).click();
    await page.getByRole("button", { name: /Standing/ }).click();
    await page.locator("button").last().click();
    await expect(page.locator('p[role="alert"]')).toBeVisible();
    await page.locator("button").last().click();
    await expect(
      page.getByRole("heading", { name: "Where is the meeting?" }),
    ).toBeVisible();
    expect(answers).toBe(2);
  });

  test("recovers from a catalogue error", async ({ page }) => {
    let attempts = 0;
    await page.unroute(`${apiOrigin}/toeic/practice/catalogue`);
    await page.route(`${apiOrigin}/toeic/practice/catalogue`, (route) => {
      attempts += 1;
      if (attempts === 1)
        return route.fulfill({ status: 503, body: "temporary" });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(catalogue),
      });
    });
    await page.goto("/toeic/practice");
    await expect(page.locator('[role="alert"]').first()).toBeVisible();
    await page.locator("button").last().click();
    await expect(page.locator("select").first()).toBeVisible();
  });
});
