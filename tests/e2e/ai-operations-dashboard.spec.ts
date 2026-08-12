import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const session = JSON.stringify({
  email: "admin@example.com",
  accessToken: "local.signed.token",
});

const overviewBody = {
  data: {
    role: "ADMIN",
    capabilities: ["editor_shell", "operational_summary"],
    operationalSummary: { activeUsers: 4, activeRoleAssignments: 3 },
  },
  meta: {
    correlationId: "ai-overview-001",
    idempotencyStatus: "not_applicable",
  },
};

const operationsBody = {
  data: {
    role: "ADMIN",
    window: {
      start: "2026-08-12T00:00:00.000Z",
      end: "2026-08-13T00:00:00.000Z",
      hours: 24,
    },
    totals: {
      requests: 4,
      allowed: 2,
      denied: 1,
      unavailable: 1,
      quotaDenials: 1,
      estimatedCostMicros: 0,
    },
    featureSummary: [{ key: "EXPLANATION", count: 4 }],
    skillSummary: [{ key: "EXPLANATION", count: 4 }],
    replayed: { state: "unavailable" },
    abuse: { state: "unavailable" },
  },
  meta: {
    correlationId: "ai-operations-001",
    idempotencyStatus: "not_applicable",
  },
};

async function prepareSession(page: Page) {
  await page.addInitScript((value) => {
    window.localStorage.setItem("englishpath.session", value);
  }, session);
  await page.route("**/api/v1/admin/overview", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(overviewBody),
    }),
  );
}

test.describe("AI operations dashboard", () => {
  test("renders the safe aggregate projection at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await prepareSession(page);
    await page.route("**/api/v1/admin/ai-operations", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(operationsBody),
      }),
    );

    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: "AI gateway operations" }),
    ).toBeVisible();
    await expect(page.getByText("Denied / quota")).toBeVisible();
    await expect(page.getByText(/EXPLANATION:/)).toHaveCount(2);
    await expect(
      page.getByText("Replay and abuse signals: unavailable."),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("userId");
    await expect(page.locator("body")).not.toContainText("idempotencyKey");

    const width = await page.locator("body").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("fails closed on an unknown response field", async ({ page }) => {
    await prepareSession(page);
    await page.route("**/api/v1/admin/ai-operations", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...operationsBody,
          data: { ...operationsBody.data, provider: "must-not-render" },
        }),
      }),
    );

    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: "AI operations unavailable" }),
    ).toBeVisible();
    await expect(page.getByText("must-not-render")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("shows an explicit retry after a transient operations failure", async ({
    page,
  }) => {
    await prepareSession(page);
    let attempts = 0;
    await page.route("**/api/v1/admin/ai-operations", (route) => {
      attempts += 1;
      if (attempts === 1) {
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: "{}",
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(operationsBody),
      });
    });

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "AI operations unavailable" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Retry" }).click();
    await expect(
      page.getByRole("heading", { name: "AI gateway operations" }),
    ).toBeVisible();
  });

  test("keeps a backend forbidden response explicit", async ({ page }) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem("englishpath.session", value);
    }, session);
    await page.route("**/api/v1/admin/overview", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: "{}",
      }),
    );

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: "Bạn chưa có quyền vận hành" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "AI gateway operations" }),
    ).toHaveCount(0);
  });
});
