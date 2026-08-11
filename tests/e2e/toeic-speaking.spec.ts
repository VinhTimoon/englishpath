import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const apiOrigin = "http://localhost:3005/api/v1";
const taskId = "ep-speaking-read-aloud-001";
const sessionId = "speaking-session-browser";
const task = {
  id: taskId,
  skill: "SPEAKING",
  taskType: "READ_ALOUD",
  version: "v1",
  promptKind: "TEXT",
  responseMode: "RECORDED_AUDIO",
  instruction: "Read clearly and at a natural pace.",
  prompt: "The morning lesson starts at nine.",
  durationSeconds: 45,
};

function envelope(data: unknown) {
  return {
    data,
    meta: { correlationId: "browser-speaking", idempotencyStatus: "created" },
  };
}

function feedbackEnvelope(data: Record<string, unknown>, replayed = false) {
  return envelope({ feedback: data, replayed });
}

function session(status: "ACTIVE" | "FINALIZED" = "ACTIVE") {
  return {
    sessionId,
    status,
    task,
    startedAt: "2026-08-11T00:00:00.000Z",
    finalizedAt: status === "FINALIZED" ? "2026-08-11T00:00:02.000Z" : null,
    submission:
      status === "FINALIZED"
        ? {
            submissionId: "speaking-submission-browser",
            recordingId: "speaking-recording-browser",
            responseMode: "RECORDED_AUDIO",
            durationSeconds: 1,
            sizeBytes: 5,
            submittedAt: "2026-08-11T00:00:02.000Z",
          }
        : null,
  };
}

async function installBrowserAudio(page: Page, permission = "granted") {
  await page.addInitScript(
    ({ permissionState }) => {
      window.localStorage.clear();
      window.localStorage.setItem(
        "englishpath.session",
        JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
      );
      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: async () => {
            if (permissionState !== "granted")
              throw new DOMException("denied", "NotAllowedError");
            return { getTracks: () => [{ stop() {} }] };
          },
        },
      });
      class FakeMediaRecorder {
        static isTypeSupported() {
          return true;
        }
        state = "inactive";
        mimeType = "audio/webm";
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          this.ondataavailable?.({
            data: new Blob(["audio"], { type: this.mimeType }),
          });
          this.onstop?.();
        }
      }
      Object.defineProperty(window, "MediaRecorder", {
        configurable: true,
        value: FakeMediaRecorder,
      });
    },
    { permissionState: permission },
  );
}

async function routeStart(page: Page, status = 200) {
  await page.route(
    `${apiOrigin}/toeic/speaking/tasks/${taskId}/sessions`,
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

test.describe("TOEIC Speaking learner journey", () => {
  test("records, previews, submits once, and preserves safe completion", async ({
    page,
  }) => {
    await installBrowserAudio(page);
    await routeStart(page);
    let submittedBody: Record<string, unknown> | null = null;
    let feedbackRequests = 0;
    await page.route(
      `${apiOrigin}/toeic/speaking/sessions/${sessionId}/submissions`,
      async (route) => {
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
      `${apiOrigin}/toeic/speaking/sessions/${sessionId}/feedback`,
      async (route) => {
        feedbackRequests += 1;
        expect(route.request().method()).toBe("POST");
        expect(route.request().headers().authorization).toBe("Bearer local");
        expect(route.request().postData()).toBeNull();
        expect(route.request().headers()["idempotency-key"]).toMatch(
          /^speaking-feedback-/,
        );
        await new Promise((resolve) => setTimeout(resolve, 75));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            feedbackEnvelope({
              outcome: "ALLOWED",
              policyVersion: "feedback-gateway-v1",
              promptVersion: "local-fixture-v1",
              feature: "SPEAKING",
              skill: "SPEAKING",
              quotaRemaining: 9,
              feedback: {
                advisoryOnly: true,
                summary: "Keep a steady pace and articulate the final sounds.",
                strengths: ["Clear attempt"],
                nextSteps: ["Repeat the sentence once at a natural pace."],
              },
            }),
          ),
        });
      },
    );
    await page.route(
      `${apiOrigin}/toeic/speaking/recordings/speaking-recording-browser/playback-capability`,
      async (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({
              playback: {
                recordingId: "speaking-recording-browser",
                capability: "browser-capability-token",
                expiresAt: "2026-08-11T01:00:00.000Z",
              },
            }),
          ),
        }),
    );
    await page.route(
      `${apiOrigin}/toeic/speaking/recordings/speaking-recording-browser/playback`,
      async (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({
              recording: {
                recordingId: "speaking-recording-browser",
                state: "AVAILABLE",
                contentType: "audio/webm",
                durationSeconds: 1,
                sizeBytes: 5,
                expiresAt: "2026-09-09T00:00:00.000Z",
              },
              playback: {
                authorized: true,
                expiresAt: "2026-08-11T01:00:00.000Z",
              },
            }),
          ),
        }),
    );

    await page.route(
      `${apiOrigin}/toeic/speaking/recordings/speaking-recording-browser/content`,
      async (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(envelope({ uploaded: true })),
        }),
    );
    await page.route(
      `${apiOrigin}/toeic/speaking/recordings/speaking-recording-browser/playback/content`,
      async (route) =>
        route.fulfill({
          status: 200,
          contentType: "audio/webm",
          body: Buffer.from("audio"),
        }),
    );

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/toeic/speaking");
    await page.getByRole("button", { name: "Start Speaking" }).click();
    await expect(
      page.getByRole("heading", { name: task.prompt }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(page.getByText(/Recording ·/)).toBeVisible();
    await page.getByRole("button", { name: "Stop recording" }).click();
    const preview = page.locator(
      'audio[aria-label="Your Speaking recording preview"]',
    );
    await preview.scrollIntoViewIfNeeded();
    await expect(preview).toBeVisible();
    await page.getByRole("button", { name: "Submit recording" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Your Speaking attempt is safely recorded",
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/Server-controlled playback is ready/),
    ).toBeVisible();
    const feedbackButton = page.getByRole("button", {
      name: "Request feedback",
    });
    await feedbackButton.focus();
    await feedbackButton.press("Enter");
    await expect(page.getByText(/Requesting safe feedback/)).toBeVisible();
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Request feedback" }),
    ).toHaveCount(0);
    await expect(
      page.getByText("Keep a steady pace and articulate the final sounds."),
    ).toBeVisible();
    await expect(
      page.getByText("Repeat the sentence once at a natural pace."),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: "Keep a steady pace" }),
    ).toBeVisible();
    expect(feedbackRequests).toBe(1);
    await expect(
      page.locator(
        'audio[aria-label="Your server-controlled Speaking recording"]',
      ),
    ).toBeVisible();
    expect(submittedBody).toEqual(
      expect.objectContaining({
        responseMode: "RECORDED_AUDIO",
        contentType: "audio/webm",
        durationSeconds: expect.any(Number),
        sizeBytes: 5,
        submissionReference: expect.stringMatching(/^browser-recording-/),
      }),
    );
    expect(await page.locator("body").innerText()).not.toMatch(
      /https?:\/\/|objectKey|tokenHash|credential|rubric/i,
    );
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("shows permission denial without losing the server task", async ({
    page,
  }) => {
    await installBrowserAudio(page, "denied");
    await routeStart(page);
    await page.goto("/toeic/speaking");
    await page.getByRole("button", { name: "Start Speaking" }).click();
    await page.getByRole("button", { name: "Start recording" }).click();
    await expect(page.getByText("Microphone permission denied")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: task.prompt }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start recording" }),
    ).toBeVisible();
  });

  test("keeps the preview retryable after a transient submission failure", async ({
    page,
  }) => {
    await installBrowserAudio(page);
    await routeStart(page);
    let submissions = 0;
    let uploads = 0;
    await page.route(
      `${apiOrigin}/toeic/speaking/sessions/${sessionId}/submissions`,
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
    await page.route(
      `${apiOrigin}/toeic/speaking/recordings/speaking-recording-browser/content`,
      async (route) => {
        uploads += 1;
        if (uploads === 1) return route.abort("failed");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(envelope({ uploaded: true })),
        });
      },
    );
    await page.goto("/toeic/speaking");
    await page.getByRole("button", { name: "Start Speaking" }).click();
    await page.getByRole("button", { name: "Start recording" }).click();
    await page.getByRole("button", { name: "Stop recording" }).click();
    await page.getByRole("button", { name: "Submit recording" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(
      "not submitted",
    );
    const preview = page.locator(
      'audio[aria-label="Your Speaking recording preview"]',
    );
    await preview.scrollIntoViewIfNeeded();
    await expect(preview).toBeVisible();
    await page.getByRole("button", { name: "Submit recording" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Your Speaking attempt is safely recorded",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retry recording upload" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry recording upload" }).click();
    await expect(
      page.getByRole("button", { name: "Retry recording upload" }),
    ).toHaveCount(0);
    expect(submissions).toBe(2);
    expect(uploads).toBe(2);
  });

  test("keeps the finalized recording safe when feedback is unavailable and retryable", async ({
    page,
  }) => {
    await installBrowserAudio(page);
    await routeStart(page);
    let submissionRequests = 0;
    await page.route(
      `${apiOrigin}/toeic/speaking/sessions/${sessionId}/submissions`,
      async (route) => (
        (submissionRequests += 1),
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: false }),
          ),
        })
      ),
    );
    let uploadRequests = 0;
    await page.route(
      `${apiOrigin}/toeic/speaking/recordings/speaking-recording-browser/content`,
      async (route) => (
        (uploadRequests += 1),
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(envelope({ uploaded: true })),
        })
      ),
    );
    let feedbackRequests = 0;
    const feedbackKeys: string[] = [];
    await page.route(
      `${apiOrigin}/toeic/speaking/sessions/${sessionId}/feedback`,
      async (route) => {
        feedbackRequests += 1;
        feedbackKeys.push(route.request().headers()["idempotency-key"] ?? "");
        if (feedbackRequests === 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return route.fulfill({ status: 503, body: "temporary" });
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            feedbackEnvelope({
              outcome: "PROVIDER_UNAVAILABLE",
              policyVersion: "feedback-gateway-v1",
              promptVersion: "local-fixture-v1",
              feature: "SPEAKING",
              skill: "SPEAKING",
              quotaRemaining: 9,
              feedback: null,
            }),
          ),
        });
      },
    );

    await page.goto("/toeic/speaking");
    await page.getByRole("button", { name: "Start Speaking" }).click();
    await page.getByRole("button", { name: "Start recording" }).click();
    await page.getByRole("button", { name: "Stop recording" }).click();
    await page.getByRole("button", { name: "Submit recording" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Your Speaking attempt is safely recorded",
      }),
    ).toBeVisible();

    await page.setViewportSize({ width: 360, height: 800 });
    const preview = page.locator(
      'audio[aria-label="Your local Speaking recording preview"]',
    );
    const feedbackButton = page.getByRole("button", {
      name: "Request feedback",
    });
    await expect(feedbackButton).toBeEnabled();
    await feedbackButton.evaluate((button) => {
      button.click();
      button.click();
    });
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(1);
    await expect(page.getByText(/Feedback could not be loaded/)).toBeVisible();
    await page.getByRole("button", { name: "Retry feedback" }).click();
    await expect(
      page.getByText(/audio feedback service is not ready/),
    ).toBeVisible();
    await expect(
      page.getByRole("status").filter({ hasText: /audio feedback service/ }),
    ).toBeVisible();
    expect(feedbackRequests).toBe(2);
    expect(feedbackKeys[0]).toBe(feedbackKeys[1]);
    expect(submissionRequests).toBe(1);
    expect(uploadRequests).toBe(1);
    await expect(preview).toBeVisible();
    expect(
      await page.locator("html").evaluate((node) => node.scrollWidth),
    ).toBeLessThanOrEqual(360);
    expect(await page.locator("body").innerText()).not.toMatch(
      /rubric|provider metadata|credential|raw submission/i,
    );
  });

  test("fails closed on malformed feedback and distinguishes validation", async ({
    page,
  }) => {
    await installBrowserAudio(page);
    await page.route(
      `${apiOrigin}/toeic/speaking/tasks/${taskId}/sessions`,
      async (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            envelope({ session: session("FINALIZED"), replayed: false }),
          ),
        }),
    );
    let feedbackRequests = 0;
    await page.route(
      `${apiOrigin}/toeic/speaking/sessions/${sessionId}/feedback`,
      async (route) => {
        feedbackRequests += 1;
        if (feedbackRequests === 1)
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              ...feedbackEnvelope({
                outcome: "ALLOWED",
                feedback: {
                  advisoryOnly: true,
                  summary: "safe-looking text",
                  strengths: [],
                  nextSteps: [],
                  hiddenRubric: "must be rejected",
                },
              }),
              meta: {
                correlationId: "browser-speaking",
                idempotencyStatus: "created",
                provider: "must be rejected",
              },
            }),
          });
        await route.fulfill({ status: 422, body: "not eligible" });
      },
    );

    await page.goto("/toeic/speaking");
    await page.getByRole("button", { name: "Start Speaking" }).click();
    await expect(
      page.getByRole("heading", {
        name: "Your Speaking attempt is safely recorded",
      }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Request feedback" }).click();
    await expect(page.getByText(/Feedback could not be loaded/)).toBeVisible();
    await page.getByRole("button", { name: "Retry feedback" }).click();
    await expect(
      page.getByText(/Feedback is not available for this attempt yet/),
    ).toBeVisible();
    expect(feedbackRequests).toBe(2);
    expect(await page.locator("body").innerText()).not.toMatch(
      /hiddenRubric|must be rejected|provider|credential/i,
    );
  });
});
