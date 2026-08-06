import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const session = JSON.stringify({
  email: "admin@example.com",
  accessToken: "local.signed.token",
});

const node = {
  id: "workplace",
  parentId: null,
  level: "B1",
  topic: "Workplace English",
  subtopic: "Meetings",
  collocations: ["take notes"],
  relatedSkills: ["Listening"],
  tracks: ["workplace"],
  toeicParts: [2],
};

const version = {
  id: "version-1",
  contentId: "content-1",
  previousVersionId: null,
  clientRequestId: "draft-1",
  contentType: "lesson",
  title: "Meeting vocabulary",
  body: "A short lesson.",
  provenance: "imported",
  usageScope: "learning",
  accessTier: "authenticated",
  taxonomyNodeId: "workplace",
  source: {
    sourceId: "drive-file-1",
    checksum: "sha256:version1",
    sourceVersion: "drive-v1",
  },
  governance: {
    licenseStatus: "approved",
    reviewStatus: "draft",
    publishStatus: "draft",
    reviewedAt: null,
    publishedAt: null,
  },
};

function envelope(data: unknown) {
  return {
    data,
    meta: {
      correlationId: "cms-browser-001",
      idempotencyStatus: "not_applicable",
    },
  };
}

test.describe("governed CMS authoring", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript((value) => {
      window.localStorage.setItem("englishpath.session", value);
    }, session);
    await page.route("**/api/v1/admin/overview", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope({
            role: "ADMIN",
            capabilities: ["editor_shell", "operational_summary"],
            operationalSummary: { activeUsers: 4, activeRoleAssignments: 3 },
          }),
        ),
      }),
    );
  });

  test("loads dynamic taxonomy and creates a redacted draft on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    await page.route("**/api/v1/cms/taxonomy/nodes**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          envelope({
            data: [node],
            pagination: { limit: 100, offset: 0, total: 1, hasNext: false },
          }),
        ),
      }),
    );
    await page.route("**/api/v1/cms/content-versions", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: { ...version, clientRequestId: "draft-1" },
          meta: {
            correlationId: "cms-browser-002",
            idempotencyStatus: "created",
          },
        }),
      }),
    );

    await page.goto("/admin");
    await expect(
      page.getByRole("heading", { name: /Tạo nội dung đúng ngay từ đầu/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /Workplace English/ }),
    ).toHaveCount(2);
    await page.getByLabel("Content ID").fill("content-1");
    await page.getByLabel("Version ID").fill("version-1");
    await page.getByLabel("Tiêu đề").fill("Meeting vocabulary");
    await page
      .getByRole("textbox", { name: "Nội dung", exact: true })
      .fill("A short lesson.");
    await page.getByLabel("Source ID").fill("drive-file-1");
    await page
      .getByLabel("Source URL (private)")
      .fill("https://private.example/source");
    await page.getByLabel("Checksum").fill("sha256:version1");
    await page.getByLabel("Source version").fill("drive-v1");
    await page.getByLabel("Rights owner").fill("Private Rights Owner");
    await page.getByRole("button", { name: "Tạo bản nháp" }).click();
    await expect(page.getByText(/Đã tạo bản nháp/)).toBeVisible();
    await expect(page.locator("body")).not.toContainText("private.example");
    const width = await page.locator("body").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth);
    const accessibility = await new AxeBuilder({ page }).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test("shows a retryable API state instead of pretending the workspace is ready", async ({
    page,
  }) => {
    await page.route("**/api/v1/cms/taxonomy/nodes**", (route) =>
      route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "RESOURCE_FORBIDDEN",
            message: "Access is forbidden.",
            details: [],
          },
          meta: {
            correlationId: "cms-browser-003",
            idempotencyStatus: "not_applicable",
          },
        }),
      }),
    );
    await page.goto("/admin");
    await expect(
      page.getByRole("alert").filter({ hasText: /Vai trò hiện tại/ }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
  });
});
