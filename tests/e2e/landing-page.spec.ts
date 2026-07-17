import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function gotoLanding(page: Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.ok(), "landing page should respond successfully").toBe(true);
}

test.describe("public landing smoke", () => {
  test("loads the current landing page with accessible landmark content", async ({
    page,
  }) => {
    await gotoLanding(page);

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /to get started, edit the page\.tsx file\./i,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", {
        name: /documentation/i,
      }),
    ).toBeVisible();
  });

  test("does not overflow horizontally at 360px", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await gotoLanding(page);

    const metrics = await page.evaluate(() => ({
      bodyScrollWidth: document.body.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(
      metrics.scrollWidth,
      `expected no horizontal overflow at 360px, got document ${metrics.scrollWidth}px > viewport ${metrics.clientWidth}px (body ${metrics.bodyScrollWidth}px)`,
    ).toBeLessThanOrEqual(metrics.clientWidth);
  });

  test("has no serious or critical axe violations", async ({ page }) => {
    await gotoLanding(page);

    const results = await new AxeBuilder({ page }).analyze();
    const blockingViolations = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? ""),
    );

    if (blockingViolations.length > 0) {
      const details = blockingViolations
        .map((violation) => {
          const targets = violation.nodes
            .map((node) => {
              const firstLine =
                node.failureSummary?.split("\n").at(0)?.trim() ??
                "Inspect this node in the retained trace/screenshot.";
              return `${node.target.join(" ")} -> ${firstLine}`;
            })
            .join("\n");

          return `${violation.impact?.toUpperCase()}: ${violation.id} (${violation.help})\n${violation.helpUrl}\n${targets}`;
        })
        .join("\n\n");

      console.error(details);
    }

    expect(
      blockingViolations,
      "serious/critical accessibility violations were found; see logged selectors above",
    ).toEqual([]);
  });
});
