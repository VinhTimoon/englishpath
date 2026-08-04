import { expect, test } from "@playwright/test";

const apiOrigin = "http://localhost:3005/api/v1";

const meta = {
  correlationId: "e2e-vocabulary",
  idempotencyStatus: "not_applicable",
};

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
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mindmapResponse()),
      }),
    );
    await page.route(`${apiOrigin}/vocabulary/items**`, (route) => {
      const pageNumber = Number(
        new URL(route.request().url()).searchParams.get("page") ?? "1",
      );
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(itemsResponse(pageNumber)),
      });
    });
  });

  test("selects a dynamic node, paginates, opens detail, and preserves context", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/vocabulary/learn?from=roadmap");
    await expect(
      page.getByRole("button", { name: /Server returned topic/ }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Server returned topic/ })
      .press("Enter");
    await expect(page).toHaveURL(/node=server-node/);
    await expect(
      page
        .locator('section[aria-labelledby="items-heading"]')
        .getByRole("heading", { name: "steady" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/from=roadmap/);
    await page.getByRole("button", { name: /Trang tiếp/ }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      page
        .locator('section[aria-labelledby="items-heading"]')
        .getByRole("heading", { name: "reliable" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Xem chi tiết" }).click();
    await expect(page.getByText("đáng tin cậy")).toBeVisible();
    await page.getByRole("button", { name: /Quay lại danh sách/ }).click();
    await expect(page.getByRole("heading", { name: "reliable" })).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(360);
  });

  test("recovers from a mindmap request failure", async ({ page }) => {
    let attempts = 0;
    await page.unroute(`${apiOrigin}/vocabulary/mindmap**`);
    await page.route(`${apiOrigin}/vocabulary/mindmap**`, (route) => {
      attempts += 1;
      if (attempts === 1)
        return route.fulfill({ status: 503, body: "temporary" });
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mindmapResponse()),
      });
    });
    await page.goto("/vocabulary/learn");
    await expect(
      page.getByRole("alert").filter({ hasText: "Chưa thể mở bản đồ" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Thử tải lại" }).click();
    await expect(
      page.getByRole("button", { name: /Server returned topic/ }),
    ).toBeVisible();
  });

  test("submits due reviews without skipping the next server item", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "englishpath.session",
        JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
      );
    });
    await page.route("**/api/v1/vocabulary/reviews/due**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            {
              vocabularyId: "due-one",
              word: "steady",
              meaning: "đều đặn",
              example: null,
              pronunciation: null,
              mastery: 20,
              repetitions: 1,
              intervalDays: 1,
              nextReviewAt: "2026-08-04T00:00:00.000Z",
            },
            {
              vocabularyId: "due-two",
              word: "reliable",
              meaning: "đáng tin cậy",
              example: null,
              pronunciation: null,
              mastery: 10,
              repetitions: 1,
              intervalDays: 1,
              nextReviewAt: "2026-08-04T00:00:00.000Z",
            },
          ],
          meta,
        }),
      }),
    );
    await page.route("**/api/v1/vocabulary/reviews/*", (route) => {
      if (route.request().method() === "GET") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: "due-one",
            word: "steady",
            meaning: "đều đặn",
            example: null,
            pronunciation: null,
            mastery: 45,
            repetitions: 2,
            intervalDays: 3,
            nextReviewAt: "2026-08-07T00:00:00.000Z",
          },
          meta: { correlationId: "e2e-review", idempotencyStatus: "created" },
        }),
      });
    });
    await page.goto("/vocabulary/learn?node=server-node");
    await page.getByRole("button", { name: "Bắt đầu ôn tập" }).click();
    await expect(
      page
        .locator('section[aria-labelledby="review-heading"]')
        .getByRole("heading"),
    ).toHaveText("steady");
    await page.getByRole("button", { name: "Nhớ" }).click();
    await expect(page.getByText(/Mức độ ghi nhớ hiện tại: 45/)).toBeVisible();
    await expect(
      page
        .locator('section[aria-labelledby="review-heading"]')
        .getByRole("heading"),
    ).toHaveText("reliable");
  });
});
