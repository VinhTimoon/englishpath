import { expect, test } from "@playwright/test";

const apiOrigin = "http://localhost:3005/api/v1";

const meta = { correlationId: "e2e-vocabulary", idempotencyStatus: "not_applicable" };

function mindmapResponse() {
  return {
    data: {
      roots: [
        {
          id: "server-node",
          kind: "topic",
          label: "Server returned topic",
          vocabularyCount: 2,
          levels: ["daily-basic"],
          tracks: [],
          skills: [],
          toeicParts: [],
          children: [],
        },
      ],
    },
    meta,
  };
}

function itemsResponse(page: number) {
  return {
    data: [
      {
        id: page === 1 ? "item-one" : "item-two",
        taxonomyNodeId: "server-node",
        word: page === 1 ? "steady" : "reliable",
        meaning: page === 1 ? "đều đặn" : "đáng tin cậy",
        example: null,
        pronunciation: null,
      },
    ],
    page: { number: page, size: 20, totalItems: 21, totalPages: 2 },
    meta,
  };
}

test.describe("learner vocabulary mindmap and item flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${apiOrigin}/vocabulary/mindmap**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mindmapResponse()) }),
    );
    await page.route(`${apiOrigin}/vocabulary/items**`, (route) => {
      const pageNumber = Number(new URL(route.request().url()).searchParams.get("page") ?? "1");
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(itemsResponse(pageNumber)) });
    });
  });

  test("selects a dynamic node, paginates, opens detail, and preserves context", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/vocabulary/learn?from=roadmap");
    await expect(page.getByRole("button", { name: /Server returned topic/ })).toBeVisible();
    await page.getByRole("button", { name: /Server returned topic/ }).press("Enter");
    await expect(page).toHaveURL(/node=server-node/);
    await expect(page.getByRole("heading", { name: "steady" })).toBeVisible();
    await expect(page).toHaveURL(/from=roadmap/);
    await page.getByRole("button", { name: /Trang tiếp/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByRole("heading", { name: "reliable" })).toBeVisible();
    await page.getByRole("button", { name: "Xem chi tiết" }).click();
    await expect(page.getByText("đáng tin cậy")).toBeVisible();
    await page.getByRole("button", { name: /Quay lại danh sách/ }).click();
    await expect(page.getByRole("heading", { name: "reliable" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  });

  test("recovers from a mindmap request failure", async ({ page }) => {
    let attempts = 0;
    await page.unroute(`${apiOrigin}/vocabulary/mindmap**`);
    await page.route(`${apiOrigin}/vocabulary/mindmap**`, (route) => {
      attempts += 1;
      if (attempts === 1) return route.fulfill({ status: 503, body: "temporary" });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mindmapResponse()) });
    });
    await page.goto("/vocabulary/learn");
    await expect(page.getByRole("alert").filter({ hasText: "Chưa thể mở bản đồ" })).toBeVisible();
    await page.getByRole("button", { name: "Thử tải lại" }).click();
    await expect(page.getByRole("button", { name: /Server returned topic/ })).toBeVisible();
  });
});
