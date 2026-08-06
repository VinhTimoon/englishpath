import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const session = JSON.stringify({
  email: "editor@example.com",
  accessToken: "local.signed.token",
});

test.describe("protected admin shell", () => {
  test("shows backend denial instead of an empty or CMS state", async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem("englishpath.session", value);
    }, session);
    await page.route("**/api/v1/admin/overview", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "FORBIDDEN",
            message: "Access is forbidden.",
            details: [],
          },
          meta: { correlationId: "admin-denied-001" },
        }),
      }),
    );

    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: "Bạn chưa có quyền vận hành" }),
    ).toBeVisible();
    await expect(
      page
        .locator('[role="alert"]')
        .filter({ hasText: "backend theo vai trò ứng dụng" }),
    ).toContainText("backend theo vai trò ứng dụng");
    await expect(page.getByText(/CMS|xuất bản/i)).toBeVisible();
    await expect(page.locator("body")).not.toHaveText(
      "Đang tải khu vực vận hành",
    );
  });

  test("renders the approved role-scoped overview on a 360px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.addInitScript((value) => {
      window.localStorage.setItem("englishpath.session", value);
    }, session);
    await page.route("**/api/v1/admin/overview", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            role: "ADMIN",
            capabilities: ["editor_shell", "operational_summary"],
            operationalSummary: { activeUsers: 4, activeRoleAssignments: 3 },
          },
          meta: {
            correlationId: "admin-success-001",
            idempotencyStatus: "not_applicable",
          },
        }),
      }),
    );

    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Admin" })).toBeVisible();
    await expect(page.getByText("Người dùng hoạt động")).toBeVisible();
    const width = await page.locator("body").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth);

    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
    const backLink = page.getByRole("link", { name: /dashboard/i });
    await backLink.focus();
    await expect(backLink).toBeFocused();
  });

  test("rejects a success payload without the stable response metadata", async ({
    page,
  }) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem("englishpath.session", value);
    }, session);
    await page.route("**/api/v1/admin/overview", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            role: "ADMIN",
            capabilities: ["editor_shell", "operational_summary"],
            operationalSummary: { activeUsers: 4, activeRoleAssignments: 3 },
          },
        }),
      }),
    );

    await page.goto("/admin");

    await expect(
      page.getByRole("heading", { name: "Chưa tải được khu vực vận hành" }),
    ).toBeVisible();
  });
});
