import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type Route } from "@playwright/test";

const api = "http://localhost:3005/api/v1/community";
const meta = (pagination?: {
  limit: number;
  offset: number;
  total: number;
  hasNext: boolean;
}) => ({
  correlationId: "community-e2e",
  idempotencyStatus: pagination ? "not_applicable" : "created",
  ...(pagination ? { pagination } : {}),
});
const post = {
  id: "post-1",
  title: "Một cách ôn từ mới",
  body: "Tôi đặt từ mới vào một câu ngắn mỗi ngày.",
  createdAt: "2026-08-12T01:00:00.000Z",
  publishedAt: "2026-08-12T02:00:00.000Z",
};

async function session(page: Page) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "englishpath.session",
      JSON.stringify({ email: "learner@example.com", accessToken: "local" }),
    ),
  );
}
async function json(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}
async function baseRoutes(page: Page, posts: unknown[] = [post]) {
  await page.route(`${api}/posts?limit=10&offset=*`, (route) =>
    json(route, {
      data: posts.slice(
        Number(new URL(route.request().url()).searchParams.get("offset")),
        Number(new URL(route.request().url()).searchParams.get("offset")) + 10,
      ),
      meta: meta({
        limit: 10,
        offset: Number(
          new URL(route.request().url()).searchParams.get("offset"),
        ),
        total: posts.length,
        hasNext:
          Number(new URL(route.request().url()).searchParams.get("offset")) +
            10 <
          posts.length,
      }),
    }),
  );
  await page.route(`${api}/moderation/queue?limit=10&offset=*`, (route) =>
    json(route, {}, 403),
  );
}

test("lists, paginates, reports safely, and passes mobile accessibility smoke", async ({
  page,
}) => {
  await session(page);
  let reportKey = "";
  await baseRoutes(page, [
    post,
    ...Array.from({ length: 10 }, (_, index) => ({
      ...post,
      id: `post-${index + 2}`,
      title: `Bài viết ${index + 2}`,
    })),
  ]);
  await page.route(`${api}/posts/post-1/reports`, async (route) => {
    reportKey = route.request().headers()["idempotency-key"] ?? "";
    expect(route.request().postDataJSON()).toEqual({ reason: "COPYRIGHT" });
    await json(route, { data: { reported: true }, meta: meta() }, 201);
  });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/community");
  await expect(page.getByRole("heading", { name: post.title })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Khu vực kiểm duyệt" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Trang sau" })).toBeEnabled();
  await page.getByRole("button", { name: "Trang sau" }).click();
  await expect(
    page.getByRole("heading", { name: "Bài viết 11" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Trang trước" }).click();
  await page.locator("#reason-post-1").selectOption("COPYRIGHT");
  await page
    .locator("#reason-post-1")
    .locator("xpath=..")
    .getByRole("button", { name: "Báo cáo" })
    .click();
  await expect(page.getByText("Máy chủ đã ghi nhận yêu cầu.")).toBeVisible();
  expect(reportKey).toMatch(/^community-.{8,}$/);
  await page.locator("#reason-post-1").focus();
  await page.keyboard.press("Tab");
  await expect(
    page
      .locator("#reason-post-1")
      .locator("xpath=..")
      .getByRole("button", { name: "Báo cáo" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("validates a bounded draft, preserves it on retry, and reuses the attempt key", async ({
  page,
}) => {
  await session(page);
  await baseRoutes(page, []);
  const keys: string[] = [];
  let requests = 0;
  await page.route(`${api}/posts`, async (route) => {
    requests++;
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    expect(Object.keys(route.request().postDataJSON()).sort()).toEqual([
      "body",
      "title",
    ]);
    if (requests === 1) return json(route, {}, 503);
    return json(
      route,
      {
        data: {
          id: "submitted-1",
          title: "Ghi chú học tập",
          body: "Nội dung hữu ích",
          status: "PENDING_REVIEW",
          createdAt: "2026-08-12T03:00:00.000Z",
        },
        meta: { ...meta(), idempotencyStatus: "replayed" },
      },
      201,
    );
  });
  await page.goto("/community");
  await page.getByRole("button", { name: "Gửi xét duyệt" }).click();
  await expect(page.getByText("Nhập tiêu đề.")).toBeVisible();
  await page.getByLabel("Tiêu đề").fill("Ghi chú học tập");
  await page.getByLabel("Nội dung").fill("Nội dung hữu ích");
  await page.getByRole("button", { name: "Gửi xét duyệt" }).dblclick();
  await expect(
    page.getByText("Chưa thể gửi yêu cầu. Bạn có thể thử lại an toàn."),
  ).toBeVisible();
  await expect(page.getByLabel("Nội dung")).toHaveValue("Nội dung hữu ích");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByText(
      "Bài viết PENDING_REVIEW đã được khôi phục từ kết quả trước đó của máy chủ và đang chờ xét duyệt.",
    ),
  ).toBeVisible();
  expect(requests).toBe(2);
  expect(keys[0]).toBe(keys[1]);
});

test("retries a report with one key and keeps an unavailable result safe", async ({
  page,
}) => {
  await session(page);
  await baseRoutes(page);
  const keys: string[] = [];
  let calls = 0;
  await page.route(`${api}/posts/post-1/reports`, async (route) => {
    calls++;
    keys.push(route.request().headers()["idempotency-key"] ?? "");
    await json(route, {}, calls === 1 ? 503 : 404);
  });
  await page.goto("/community");
  await page.getByRole("button", { name: "Báo cáo" }).click();
  await expect(
    page.getByText("Chưa thể gửi yêu cầu. Bạn có thể thử lại an toàn."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thử lại yêu cầu" }).click();
  await expect(
    page.getByText(
      "Nội dung này hiện không khả dụng. Không có thêm thông tin được tiết lộ.",
    ),
  ).toBeVisible();
  expect(calls).toBe(2);
  expect(keys[0]).toBe(keys[1]);
});

test("renders a replayed report result without exposing private metadata", async ({
  page,
}) => {
  await session(page);
  await baseRoutes(page);
  await page.route(`${api}/posts/post-1/reports`, (route) =>
    json(
      route,
      {
        data: { reported: true },
        meta: { ...meta(), idempotencyStatus: "replayed" },
      },
      201,
    ),
  );
  await page.goto("/community");
  await page.getByRole("button", { name: "Báo cáo" }).click();
  await expect(
    page.getByText("Kết quả trước đó từ máy chủ đã được khôi phục."),
  ).toBeVisible();
});

test("prevents duplicate report clicks while the request is pending", async ({
  page,
}) => {
  await session(page);
  await baseRoutes(page);
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(`${api}/posts/post-1/reports`, async (route) => {
    calls++;
    await gate;
    await json(route, { data: { reported: true }, meta: meta() }, 201);
  });
  await page.goto("/community");
  const reportButton = page.getByRole("button", { name: "Báo cáo" }).first();
  await reportButton.dblclick();
  expect(calls).toBe(1);
  release();
  await expect(page.getByText("Máy chủ đã ghi nhận yêu cầu.")).toBeVisible();
});

test("renders auth state for a server-returned 401", async ({ page }) => {
  await session(page);
  await page.route(`${api}/posts?limit=10&offset=0`, (route) =>
    json(route, {}, 401),
  );
  await page.route(`${api}/moderation/queue?limit=10&offset=0`, (route) =>
    json(route, {}, 401),
  );
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: "Cần đăng nhập", exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Cần đăng nhập để kiểm duyệt" }),
  ).toBeVisible();
});

test("renders an explicit empty state and retries a transient listing error", async ({
  page,
}) => {
  await session(page);
  let attempts = 0;
  await page.route(`${api}/posts?limit=10&offset=0`, async (route) => {
    attempts++;
    if (attempts === 1) return json(route, {}, 503);
    return json(route, {
      data: [],
      meta: meta({ limit: 10, offset: 0, total: 0, hasNext: false }),
    });
  });
  await page.route(`${api}/moderation/queue?limit=10&offset=0`, (route) =>
    json(route, {}, 403),
  );
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: "Chưa tải được cộng đồng" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa có bài viết" }),
  ).toBeVisible();
  expect(attempts).toBe(2);
});

test("rejects oversized submission before sending it", async ({ page }) => {
  await session(page);
  await baseRoutes(page, []);
  let submitted = false;
  await page.route(`${api}/posts`, (route) => {
    submitted = true;
    return route.abort();
  });
  await page.goto("/community");
  await page.getByLabel("Tiêu đề").fill("x".repeat(121));
  await page.getByLabel("Nội dung").fill("Nội dung");
  await page.getByRole("button", { name: "Gửi xét duyệt" }).click();
  await expect(page.getByText("Tiêu đề tối đa 120 ký tự.")).toBeVisible();
  expect(submitted).toBe(false);
});

test("fails closed on malformed pagination metadata", async ({ page }) => {
  await session(page);
  await page.route(`${api}/posts?limit=10&offset=0`, (route) =>
    json(route, {
      data: [],
      meta: meta({ limit: 10, offset: 10, total: 0, hasNext: false }),
    }),
  );
  await page.route(`${api}/moderation/queue?limit=10&offset=0`, (route) =>
    json(route, {}, 403),
  );
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: "Chưa tải được cộng đồng" }),
  ).toBeVisible();
});

test("fails closed on unknown fields and offers a generic retry", async ({
  page,
}) => {
  await session(page);
  await page.route(`${api}/posts?limit=10&offset=0`, (route) =>
    json(route, {
      data: [{ ...post, ownerUserId: "private" }],
      meta: meta({ limit: 10, offset: 0, total: 1, hasNext: true }),
    }),
  );
  await page.route(`${api}/moderation/queue?limit=10&offset=0`, (route) =>
    json(route, {}, 403),
  );
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: "Chưa tải được cộng đồng" }),
  ).toBeVisible();
  await expect(page.getByText("private")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Thử lại" })).toBeVisible();
});

test("fails closed on unknown root and meta fields", async ({ page }) => {
  await session(page);
  await page.route(`${api}/posts?limit=10&offset=0`, (route) =>
    json(route, {
      data: [],
      meta: {
        ...meta({ limit: 10, offset: 0, total: 0, hasNext: false }),
        privateTrace: "secret",
      },
      privateRoot: "secret",
    }),
  );
  await page.route(`${api}/moderation/queue?limit=10&offset=0`, (route) =>
    json(route, {}, 403),
  );
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: "Chưa tải được cộng đồng" }),
  ).toBeVisible();
  await expect(page.getByText("secret")).toHaveCount(0);
});

test("shows auth/forbidden boundaries and supports moderator decision replay", async ({
  page,
}) => {
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: "Cần đăng nhập", exact: true }).first(),
  ).toBeVisible();
  await session(page);
  await page.route(`${api}/posts?limit=10&offset=0`, (route) =>
    json(route, {
      data: [],
      meta: meta({ limit: 10, offset: 0, total: 0, hasNext: false }),
    }),
  );
  const queuePost = {
    id: "queue-1",
    title: "Bài cần duyệt",
    body: "Nội dung đang chờ quyết định.",
    status: "FLAGGED",
    createdAt: "2026-08-12T01:00:00.000Z",
    reportCount: 2,
    reasons: ["SPAM"],
  };
  await page.route(`${api}/moderation/queue?limit=10&offset=*`, (route) =>
    json(route, {
      data:
        Number(new URL(route.request().url()).searchParams.get("offset")) === 0
          ? [queuePost]
          : [{ ...queuePost, id: "queue-11", title: "Bài thứ mười một" }],
      meta: meta({
        limit: 10,
        offset: Number(
          new URL(route.request().url()).searchParams.get("offset"),
        ),
        total: 11,
        hasNext:
          Number(new URL(route.request().url()).searchParams.get("offset")) ===
          0,
      }),
    }),
  );
  let calls = 0;
  const decisionKeys: string[] = [];
  let releaseDecision!: () => void;
  const decisionGate = new Promise<void>((resolve) => {
    releaseDecision = resolve;
  });
  await page.route(`${api}/moderation/queue-1/decision`, async (route) => {
    calls++;
    decisionKeys.push(route.request().headers()["idempotency-key"] ?? "");
    expect(route.request().postDataJSON()).toEqual({ decision: "REJECT" });
    if (calls === 1) {
      await decisionGate;
      return json(route, {}, 409);
    }
    await json(
      route,
      {
        data: { id: "queue-1", status: "REJECTED" },
        meta: { ...meta(), idempotencyStatus: "replayed" },
      },
      201,
    );
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Hàng đợi kiểm duyệt" }),
  ).toBeVisible();
  const moderation = page.getByLabel("Hàng đợi kiểm duyệt");
  await expect(
    moderation.getByRole("button", { name: "Trang sau" }),
  ).toBeEnabled();
  await moderation.getByRole("button", { name: "Trang sau" }).click();
  await expect(
    moderation.getByRole("heading", { name: "Bài thứ mười một" }),
  ).toBeVisible();
  await moderation.getByRole("button", { name: "Trang trước" }).click();
  await page.getByLabel("Quyết định").selectOption("REJECT");
  await page.getByRole("button", { name: "Áp dụng" }).dblclick();
  expect(calls).toBe(1);
  releaseDecision();
  await expect(
    page.getByText(
      "Yêu cầu xung đột với trạng thái hiện tại. Nội dung của bạn vẫn được giữ.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Thử lại quyết định" }).click();
  await expect(
    page.getByText("Kết quả trước đó từ máy chủ đã được khôi phục."),
  ).toBeVisible();
  expect(calls).toBe(2);
  expect(decisionKeys[0]).toBe(decisionKeys[1]);
});

test("renders a safe report conflict without exposing target details", async ({
  page,
}) => {
  await session(page);
  await baseRoutes(page);
  await page.route(`${api}/posts/post-1/reports`, (route) =>
    json(route, {}, 409),
  );
  await page.goto("/community");
  await page.getByRole("button", { name: "Báo cáo" }).click();
  await expect(
    page.getByText(
      "Yêu cầu xung đột với trạng thái hiện tại. Nội dung của bạn vẫn được giữ.",
    ),
  ).toBeVisible();
  await expect(page.getByText("post-1")).toHaveCount(0);
});

test("fails closed on an unknown moderation queue field", async ({ page }) => {
  await session(page);
  await page.route(`${api}/posts?limit=10&offset=0`, (route) =>
    json(route, {
      data: [],
      meta: meta({ limit: 10, offset: 0, total: 0, hasNext: false }),
    }),
  );
  await page.route(`${api}/moderation/queue?limit=10&offset=0`, (route) =>
    json(route, {
      data: [
        {
          id: "queue-1",
          title: "Hidden",
          body: "Hidden",
          status: "FLAGGED",
          createdAt: "2026-08-12T01:00:00.000Z",
          reportCount: 1,
          reasons: [],
          privateReportText: "secret",
        },
      ],
      meta: meta({ limit: 10, offset: 0, total: 1, hasNext: false }),
    }),
  );
  await page.goto("/community");
  await expect(
    page.getByRole("heading", { name: "Chưa tải được hàng đợi" }),
  ).toBeVisible();
  await expect(page.getByText("secret")).toHaveCount(0);
});

test("fails closed on an unknown mutation response", async ({ page }) => {
  await session(page);
  await baseRoutes(page, []);
  await page.route(`${api}/posts`, async (route) =>
    json(
      route,
      {
        data: {
          id: "submitted-unknown",
          title: "Bài viết",
          body: "Nội dung",
          status: "PENDING_REVIEW",
          createdAt: "2026-08-12T03:00:00.000Z",
          privateAuditNote: "secret",
        },
        meta: { ...meta(), idempotencyStatus: "created" },
      },
      201,
    ),
  );
  await page.goto("/community");
  await page.getByLabel("Tiêu đề").fill("Bài viết");
  await page.getByLabel("Nội dung").fill("Nội dung");
  await page.getByRole("button", { name: "Gửi xét duyệt" }).click();
  await expect(
    page.getByText("Chưa thể gửi yêu cầu. Bạn có thể thử lại an toàn."),
  ).toBeVisible();
  await expect(page.getByText("secret")).toHaveCount(0);
});

test("renders a server-created moderation decision", async ({ page }) => {
  await session(page);
  await page.route(`${api}/posts?limit=10&offset=0`, (route) =>
    json(route, {
      data: [],
      meta: meta({ limit: 10, offset: 0, total: 0, hasNext: false }),
    }),
  );
  await page.route(`${api}/moderation/queue?limit=10&offset=0`, (route) =>
    json(route, {
      data: [
        {
          id: "queue-created",
          title: "Bài chờ quyết định",
          body: "Nội dung an toàn.",
          status: "PENDING_REVIEW",
          createdAt: "2026-08-12T01:00:00.000Z",
          reportCount: 0,
          reasons: [],
        },
      ],
      meta: meta({ limit: 10, offset: 0, total: 1, hasNext: false }),
    }),
  );
  await page.route(`${api}/moderation/queue-created/decision`, (route) =>
    json(
      route,
      {
        data: { id: "queue-created", status: "PUBLISHED" },
        meta: { ...meta(), idempotencyStatus: "created" },
      },
      201,
    ),
  );
  await page.goto("/community");
  await page.getByRole("button", { name: "Áp dụng" }).click();
  await expect(page.getByText("Máy chủ đã ghi nhận yêu cầu.")).toBeVisible();
});
