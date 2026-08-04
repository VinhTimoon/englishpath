import { test, expect, type Page, type Route } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { getPublicApiBase } from "../../apps/web/src/shared/api/public-api-client";

const topic = {
  id: "workplace-meetings",
  domainId: "workplace",
  label: "Meetings",
  order: 1,
  vocabularyCount: 64,
  levels: ["workplace-english", "toeic-core"],
  tracks: ["workplace-english", "toeic-listening-reading"],
  skills: ["listening", "speaking"],
  toeicParts: [2, 3, 4],
};

const root = {
  id: "workplace",
  kind: "domain",
  label: "Workplace",
  vocabularyCount: 120,
  levels: ["workplace-english", "toeic-core"],
  tracks: ["workplace-english"],
  skills: ["reading", "listening", "speaking", "writing"],
  toeicParts: [2, 3, 4, 5, 6, 7],
  children: [
    {
      id: "workplace-meetings",
      kind: "topic",
      label: "Meetings",
      vocabularyCount: 64,
      levels: ["workplace-english", "toeic-core"],
      tracks: ["workplace-english", "toeic-listening-reading"],
      skills: ["listening", "speaking"],
      toeicParts: [2, 3, 4],
      children: [
        {
          id: "workplace-meetings-scheduling",
          kind: "subtopic",
          label: "Scheduling",
          vocabularyCount: 24,
          levels: ["workplace-english", "toeic-core"],
          tracks: ["workplace-english"],
          skills: ["listening", "speaking"],
          toeicParts: [2, 3],
          children: [],
        },
      ],
    },
  ],
};

const alternateTopic = {
  ...topic,
  id: "workplace-zebra",
  label: "Zebra topic",
  order: 9,
};

const orderedRoot = {
  ...root,
  children: [
    {
      id: "workplace-zebra",
      kind: "topic",
      label: "Zebra topic",
      vocabularyCount: 12,
      levels: ["workplace-english"],
      tracks: ["workplace-english"],
      skills: ["reading"],
      toeicParts: [7],
      children: [],
    },
    {
      ...root.children[0],
      children: [
        {
          ...root.children[0].children[0],
          id: "workplace-meetings-zebra",
          label: "Zebra subtopic",
        },
        root.children[0].children[0],
      ],
    },
  ],
};

const alternateRoot = {
  ...root,
  id: "zebra-domain",
  label: "Zebra domain",
  children: [],
};

const meta = {
  correlationId: "browser-contract-001",
  idempotencyStatus: "not_applicable",
};

function json(route: Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

async function interceptVocabulary(
  page: Page,
  options: {
    empty?: boolean;
    delay?: number;
    fail?: (url: string) => boolean;
    malformedTopics?: boolean;
    malformedMindmap?: boolean;
    ordering?: boolean;
    notFound?: (url: string) => boolean;
  } = {},
) {
  const requests: string[] = [];
  await page.route(
    "http://localhost:3005/api/v1/vocabulary/**",
    async (route) => {
      requests.push(route.request().url());
      if (options.delay)
        await new Promise((resolve) => setTimeout(resolve, options.delay));
      if (options.notFound?.(route.request().url())) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "RESOURCE_NOT_FOUND",
              message: "Vocabulary taxonomy root was not found.",
              details: [],
            },
            meta,
          }),
        });
        return;
      }
      if (options.fail?.(route.request().url())) {
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: "provider-secret",
        });
        return;
      }
      if (route.request().url().includes("/topics")) {
        await json(route, {
          data: options.empty
            ? []
            : options.ordering
              ? [alternateTopic, topic]
              : [topic],
          page: {
            number: 1,
            size: 50,
            totalItems: options.empty ? 0 : options.ordering ? 2 : 1,
            totalPages: options.empty ? 0 : 1,
          },
          meta,
          ...(options.malformedTopics
            ? { privateSourceId: "must-not-pass" }
            : {}),
        });
        return;
      }
      await json(route, {
        data: {
          roots: options.empty
            ? []
            : options.ordering
              ? [alternateRoot, orderedRoot]
              : [root],
        },
        meta,
        ...(options.malformedMindmap ? { privateEvidence: true } : {}),
      });
    },
  );
  return requests;
}

test.describe("public vocabulary taxonomy explorer", () => {
  test("validates the public API base without credentials or extra paths", () => {
    const previous = process.env.NEXT_PUBLIC_API_BASE_URL;
    try {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    expect(getPublicApiBase()).toBe("http://localhost:3005/api/v1");
      for (const invalid of [
        "https://user:secret@example.com/api/v1",
        "https://example.com/api/v1/",
        "https://example.com/api/v2",
        "https://example.com/api/v1?debug=true",
      ]) {
        process.env.NEXT_PUBLIC_API_BASE_URL = invalid;
        expect(() => getPublicApiBase()).toThrow();
      }
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
      else process.env.NEXT_PUBLIC_API_BASE_URL = previous;
    }
  });

  test("shows crawlable levels, loading, and the backend-ordered semantic tree", async ({
    page,
  }) => {
    await interceptVocabulary(page, { delay: 250, ordering: true });
    await page.goto("/vocabulary");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Nhìn rõ từ vựng trước khi bắt đầu học.",
    );
    await expect(
      page.getByRole("heading", { level: 3, name: "Daily Basic" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 3, name: "Academic / Professional" }),
    ).toBeVisible();
    await expect(page.getByLabel("Đang tải bản đồ từ vựng")).toBeVisible();
    await expect(page.getByText("2 chủ đề phù hợp")).toBeVisible();
    await expect(page.locator('[data-node-id="workplace"]')).toContainText(
      "Workplace",
    );
    await expect(
      page.locator('[data-node-id="workplace-meetings"]'),
    ).toContainText("Meetings");
    await expect(
      page.locator('[data-node-id="workplace-meetings"]'),
    ).toContainText("toeic-listening-reading");
    await expect(
      page.locator('[data-node-id="workplace-meetings-scheduling"]'),
    ).toContainText("Scheduling");
    await expect(page.getByText(/không lưu mức độ thành thạo/i)).toBeVisible();
    expect(await page.locator("h1").count()).toBe(1);
    expect(
      await page.locator('[aria-label="Cây chủ đề từ vựng"] ul ul').count(),
    ).toBeGreaterThan(0);
    await expect(page.locator("aside ol li span")).toHaveText([
      "Zebra topic",
      "Meetings",
    ]);
    expect(
      await page
        .locator('[aria-label="Cây chủ đề từ vựng"] > ul > li')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-node-id")),
        ),
    ).toEqual(["zebra-domain", "workplace"]);
    expect(
      await page
        .locator('[data-node-id="workplace"] > ul > li')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-node-id")),
        ),
    ).toEqual(["workplace-zebra", "workplace-meetings"]);
    expect(
      await page
        .locator('[data-node-id="workplace-meetings"] > ul > li')
        .evaluateAll((nodes) =>
          nodes.map((node) => node.getAttribute("data-node-id")),
        ),
    ).toEqual(["workplace-meetings-zebra", "workplace-meetings-scheduling"]);
    await expect(page.locator("body")).not.toContainText(
      /checksum|licenseStatus|provider-secret/i,
    );
  });

  test("owns filters in the URL and supports native keyboard controls", async ({
    page,
  }) => {
    const requests = await interceptVocabulary(page);
    await page.goto("/vocabulary?level=toeic-core&depth=2");
    await expect(page.getByRole("combobox", { name: "Cấp độ" })).toHaveValue(
      "toeic-core",
    );
    await expect(
      page.getByRole("combobox", { name: "Độ sâu cây" }),
    ).toHaveValue("2");

    const skill = page.getByRole("combobox", { name: "Kỹ năng" });
    await skill.focus();
    await skill.press("ArrowDown");
    await skill.press("Enter");
    await expect(skill).toHaveValue("reading");
    await expect(page).toHaveURL(/level=toeic-core/);
    await expect(page).toHaveURL(/skill=reading/);
    await page.getByRole("combobox", { name: "TOEIC Part" }).selectOption("3");
    await page
      .getByRole("combobox", { name: "Lộ trình" })
      .selectOption("workplace-english");
    await page.getByRole("combobox", { name: "Độ sâu cây" }).selectOption("1");
    await page.getByRole("textbox", { name: "Gốc chủ đề" }).fill("workplace");
    await expect(page).toHaveURL(/toeicPart=3/);
    await expect(page).toHaveURL(/rootId=workplace/);
    await expect(page).toHaveURL(/track=workplace-english/);
    await expect(page).toHaveURL(/depth=1/);
    await expect
      .poll(() =>
        requests.some(
          (url) =>
            url.includes("toeicPart=3") && url.includes("rootId=workplace"),
        ),
      )
      .toBe(true);
    const topicsUrl = requests.findLast((url) => url.includes("/topics"));
    const mindmapUrl = requests.findLast((url) => url.includes("/mindmap"));
    expect(topicsUrl).toContain("page=1&size=50");
    expect(topicsUrl).not.toMatch(/rootId=|depth=/);
    expect(mindmapUrl).toContain("rootId=workplace");
    expect(mindmapUrl).toContain("depth=1");
    expect(mindmapUrl).not.toMatch(/page=|size=/);

    requests.length = 0;
    await page.goto(`/vocabulary?rootId=${"a".repeat(97)}`);
    await expect(page.getByRole("textbox", { name: "Gốc chủ đề" })).toHaveValue(
      "",
    );
    await expect.poll(() => requests.length).toBeGreaterThanOrEqual(2);
    expect(requests.every((url) => !url.includes("rootId="))).toBe(true);
  });

  test("normalizes failures and lets the visitor retry", async ({ page }) => {
    let failing = true;
    await interceptVocabulary(page, { fail: () => failing });
    await page.goto("/vocabulary");
    await expect(
      page.locator('[role="alert"]:has-text("Chưa thể mở bản đồ")'),
    ).toContainText("Chưa thể mở bản đồ");
    await expect(page.locator("body")).not.toContainText("provider-secret");
    failing = false;
    await page.getByRole("button", { name: "Thử tải lại" }).click();
    await expect(page.getByText("1 chủ đề phù hợp")).toBeVisible();
  });

  test("rejects unknown envelope fields and an independently failing tree", async ({
    page,
  }) => {
    await interceptVocabulary(page, { malformedTopics: true });
    await page.goto("/vocabulary");
    await expect(
      page.locator('[role="alert"]:has-text("Chưa thể mở bản đồ")'),
    ).toBeVisible();
    await expect(page.locator("body")).not.toContainText("must-not-pass");

    await page.unrouteAll({ behavior: "wait" });
    await interceptVocabulary(page, {
      fail: (url) => url.includes("/mindmap"),
    });
    await page.reload();
    await expect(
      page.locator('[role="alert"]:has-text("Chưa thể mở bản đồ")'),
    ).toBeVisible();

    await page.unrouteAll({ behavior: "wait" });
    await interceptVocabulary(page, { malformedMindmap: true });
    await page.reload();
    await expect(
      page.locator('[role="alert"]:has-text("Chưa thể mở bản đồ")'),
    ).toBeVisible();

    await page.unrouteAll({ behavior: "wait" });
    await interceptVocabulary(page, {
      notFound: (url) => url.includes("rootId=unknown-root"),
    });
    await page.goto("/vocabulary?rootId=unknown-root");
    await expect(
      page.locator('[role="alert"]:has-text("Chưa thể mở bản đồ")'),
    ).toBeVisible();
  });

  test("distinguishes catalogue and filtered empty states", async ({
    page,
  }) => {
    await interceptVocabulary(page, { empty: true });
    await page.goto("/vocabulary");
    await expect(page.locator('[data-state="empty"]')).toContainText(
      "Danh mục đang được chuẩn bị",
    );
    await page
      .getByRole("combobox", { name: "Cấp độ" })
      .selectOption("daily-basic");
    await expect(page.locator('[data-state="filtered-empty"]')).toContainText(
      "Chưa có chủ đề khớp bộ lọc",
    );
    await page.getByRole("button", { name: "Xem tất cả chủ đề" }).click();
    await expect(page).not.toHaveURL(/level=/);
  });

  test("has no mobile overflow or blocking accessibility findings", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 360, height: 800 });
    await interceptVocabulary(page);
    await page.goto("/vocabulary");
    await expect(page.getByText("1 chủ đề phù hợp")).toBeVisible();
    const width = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(width.scroll).toBeLessThanOrEqual(width.client);
    const animation = await page
      .locator('[aria-label="Cây chủ đề từ vựng"]')
      .evaluate(
        () =>
          getComputedStyle(
            document.querySelector('[aria-label="Cây chủ đề từ vựng"]')!,
          ).animationDuration,
      );
    expect(animation).toBe("0s");
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(({ impact }) =>
        ["serious", "critical"].includes(impact ?? ""),
      ),
    ).toEqual([]);
  });
});
