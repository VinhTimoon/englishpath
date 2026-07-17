import { expect, test } from "@playwright/test";

const phases = [
  "FOUNDATION",
  "SKILL_BUILDING",
  "PRACTICE_CORRECTION",
  "SIMULATION_REVIEW",
];
const items = phases.flatMap((phase, phaseIndex) =>
  Array.from({ length: 3 }, (_, index) => ({
    id: `item-${phaseIndex}-${index}`,
    dayNumber: phaseIndex + 1,
    sequence: index + 1,
    phase,
    skill: index === 0 ? "VOCABULARY" : "LISTENING",
    taskType: index === 0 ? "VOCABULARY" : "LISTENING",
    title: index === 0 ? "Từ vựng theo chủ đề" : `Bài luyện ${index + 1}`,
    minutes: 7,
    status: "PENDING",
    completedAt: null,
  })),
);

test("learner generates a roadmap and completes today's work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.addInitScript(() => {
    localStorage.setItem(
      "englishpath.session",
      JSON.stringify({
        email: "learner@example.com",
        accessToken: "englishpath.local.learner",
      }),
    );
  });
  let generated = false;
  let completed = false;
  const roadmap = () => ({
    id: "roadmap-001",
    version: 1,
    goal: "ENGLISH_FOUNDATION",
    level: "INTERMEDIATE",
    durationDays: 30,
    dailyMinutes: 20,
    todayNumber: 1,
    todayItems: items
      .filter(({ dayNumber }) => dayNumber === 1)
      .map((item) =>
        item.id === "item-0-0" && completed
          ? { ...item, status: "COMPLETED" }
          : item,
      ),
    items: items.map((item) =>
      item.id === "item-0-0" && completed
        ? { ...item, status: "COMPLETED" }
        : item,
    ),
    completedItems: completed ? 1 : 0,
    totalItems: items.length,
  });

  await page.route("http://localhost:3000/api/v1/**", async (route) => {
    expect(route.request().headers().authorization).toBe(
      "Bearer englishpath.local.learner",
    );
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/placement/result")) {
      return route.fulfill({
        json: { data: { score: 6, total: 10, level: "INTERMEDIATE" } },
      });
    }
    if (path.endsWith("/roadmaps/current")) {
      return route.fulfill({ json: { data: generated ? roadmap() : null } });
    }
    if (path.endsWith("/roadmaps/generate")) {
      generated = true;
      return route.fulfill({ status: 201, json: { data: roadmap() } });
    }
    if (path.endsWith("/roadmaps/items/item-0-0/status")) {
      expect(route.request().postDataJSON()).toEqual({ status: "COMPLETED" });
      completed = true;
      return route.fulfill({ json: { data: roadmap() } });
    }
    return route.abort();
  });

  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Tạo lộ trình của tôi" }).click();
  await expect(
    page.getByRole("heading", { name: "Việc học hôm nay" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Xem toàn lộ trình" }).click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByText("30 ngày tiến bộ có định hướng.")).toBeVisible();
  await expect(page.getByText("0%", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Hoàn thành" }).first().click();
  await expect(page.getByText("Đã xong")).toBeVisible();
  await expect(page.getByText("8%", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Xây nền" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mô phỏng và tổng ôn" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    ),
  ).toBe(false);
});
