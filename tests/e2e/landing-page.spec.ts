import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function gotoLanding(page: Page) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.ok(), "landing page should respond successfully").toBe(true);
}

async function expectFocusContrast(
  page: Page,
  controlSelector: string,
  surfaceSelector: string,
) {
  const control = page.locator(controlSelector);
  await control.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(control).toBeFocused();
  const focusStyle = await control.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      boxShadow: style.boxShadow,
      style: style.outlineStyle,
      width: parseFloat(style.outlineWidth),
    };
  });
  expect(focusStyle.style).not.toBe("none");
  expect(focusStyle.width).toBeGreaterThanOrEqual(3);
  expect(focusStyle.boxShadow).not.toBe("none");

  const ratio = await page.evaluate(
    ({ controlSelector, surfaceSelector }) => {
      const control = document.querySelector(controlSelector);
      const surface = document.querySelector(surfaceSelector);
      if (
        !(control instanceof HTMLElement) ||
        !(surface instanceof HTMLElement)
      ) {
        throw new Error("Focus contrast target is missing.");
      }

      const parseRgb = (value: string) => {
        const channels = value
          .match(/[\d.]+/g)
          ?.slice(0, 3)
          .map(Number);
        if (!channels || channels.length !== 3) {
          throw new Error(`Invalid color: ${value}`);
        }
        return channels;
      };
      const luminance = (value: string) => {
        const channels = parseRgb(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      };
      const outline = luminance(getComputedStyle(control).outlineColor);
      const background = luminance(getComputedStyle(surface).backgroundColor);
      return (
        (Math.max(outline, background) + 0.05) /
        (Math.min(outline, background) + 0.05)
      );
    },
    { controlSelector, surfaceSelector },
  );

  expect(ratio).toBeGreaterThanOrEqual(3);
}

test.describe("public landing and guest trial", () => {
  test("renders the nine public widgets in the documented order", async ({
    page,
  }) => {
    await gotoLanding(page);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: /đừng học nhiều hơn\. hãy học đúng đường\./i,
      }),
    ).toBeVisible();

    const widgetOrder = await page
      .locator("[data-widget]")
      .evaluateAll((widgets) =>
        widgets.map((widget) => widget.getAttribute("data-widget")),
      );

    expect(widgetOrder).toEqual([
      "PublicHeader",
      "Hero",
      "LearningLoop",
      "PathPreview",
      "OutcomeProof",
      "HowItWorks",
      "ContentPreview",
      "FinalCallToAction",
      "PublicFooter",
    ]);
    await expect(
      page.getByRole("link", { name: "Blog", exact: true }).first(),
    ).toHaveAttribute("href", "/blog");
  });

  test("offers seven keyboard-operable goals and updates the local sample", async ({
    page,
  }) => {
    await gotoLanding(page);
    await page.waitForLoadState("networkidle");
    const interactionRequests: string[] = [];
    page.on("request", (request) => interactionRequests.push(request.url()));
    const storageBefore = await page.evaluate(() => ({
      local: { ...localStorage },
      session: { ...sessionStorage },
    }));

    const radios = page.getByRole("radio");
    await expect(radios).toHaveCount(7);
    const goalSamples = [
      ["Xây nền tiếng Anh", "steady · đều đặn"],
      ["Giao tiếp hằng ngày", "catch up · trò chuyện, cập nhật"],
      ["Tiếng Anh bốn kỹ năng", "summarize · tóm tắt"],
      ["Tiếng Anh công việc", "deadline · thời hạn"],
      ["TOEIC Listening & Reading", "shipment · lô hàng"],
      ["TOEIC Speaking & Writing", "proposal · đề xuất"],
      ["TOEIC bốn kỹ năng", "coordinate · phối hợp"],
    ] as const;
    for (const [label, sampleText] of goalSamples) {
      const goal = page.getByRole("radio", { name: label, exact: true });
      await expect(goal).toBeVisible();
      await goal.check();
      await expect(page.getByTestId("sample-day")).toContainText(sampleText);
    }

    await page.getByRole("radio", { name: "Xây nền tiếng Anh" }).check();
    await expect(
      page.getByText("120 ngày", { exact: false }).first(),
    ).toBeVisible();

    const foundation = page.getByRole("radio", { name: "Xây nền tiếng Anh" });
    await foundation.focus();
    await expect(foundation).toBeFocused();

    await foundation.press("ArrowDown");
    const communication = page.getByRole("radio", {
      name: "Giao tiếp hằng ngày",
    });
    await expect(communication).toBeChecked();
    const sample = page.getByTestId("sample-day");
    await expect(sample).toContainText("catch up · trò chuyện, cập nhật");
    await expect(sample).toContainText("Could you say that one more time?");
    await expect(sample).toContainText(/kết quả không được lưu/i);

    await page.getByRole("radio", { name: "TOEIC bốn kỹ năng" }).check();
    await expect(sample).toContainText("coordinate · phối hợp");
    await expect(sample).toContainText("120 ngày");
    expect(interactionRequests).toEqual([]);
    await expect
      .poll(() =>
        page.evaluate(() => ({
          local: { ...localStorage },
          session: { ...sessionStorage },
        })),
      )
      .toEqual(storageBefore);
  });

  test("keeps focus indicators at 3:1 contrast across landing surfaces", async ({
    page,
  }) => {
    await gotoLanding(page);

    await expectFocusContrast(
      page,
      '.goal-option input[value="foundation"]',
      ".goal-option:has(input:checked)",
    );
    await expectFocusContrast(
      page,
      '.final-cta a[href="#guest-trial"]',
      ".final-cta",
    );
    await expectFocusContrast(
      page,
      '.public-footer a[href="#top"]',
      ".public-footer",
    );
  });

  test("honors reduced motion, touch targets, and amber text contrast", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await gotoLanding(page);

    const result = await page.evaluate(() => {
      const parseRgb = (value: string) => {
        const channels = value
          .match(/[\d.]+/g)
          ?.slice(0, 3)
          .map(Number);
        if (!channels || channels.length !== 3)
          throw new Error(`Invalid color: ${value}`);
        return channels;
      };
      const luminance = (value: string) => {
        const channels = parseRgb(value).map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      };
      const contrast = (foreground: string, background: string) => {
        const first = luminance(foreground);
        const second = luminance(background);
        return (
          (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
        );
      };
      const undersizedTargets = Array.from(
        document.querySelectorAll<HTMLElement>(".public-site a, .goal-option"),
      )
        .map((element) => ({
          label: element.textContent?.trim().slice(0, 40),
          rect: element.getBoundingClientRect(),
        }))
        .filter(({ rect }) => rect.width < 44 || rect.height < 44)
        .map(({ label, rect }) => ({
          label,
          width: rect.width,
          height: rect.height,
        }));
      const amberCard = document.querySelector<HTMLElement>(".path-60");
      const amberText = amberCard?.querySelector<HTMLElement>("p:last-child");
      if (!amberCard || !amberText)
        throw new Error("Amber contrast target is missing.");

      return {
        amberContrast: contrast(
          getComputedStyle(amberText).color,
          getComputedStyle(amberCard).backgroundColor,
        ),
        scrollBehavior: getComputedStyle(document.documentElement)
          .scrollBehavior,
        transitionSeconds: parseFloat(
          getComputedStyle(document.querySelector<HTMLElement>(".button")!)
            .transitionDuration,
        ),
        undersizedTargets,
      };
    });

    expect(result.scrollBehavior).toBe("auto");
    expect(result.transitionSeconds).toBeLessThanOrEqual(0.01);
    expect(result.undersizedTargets).toEqual([]);
    expect(result.amberContrast).toBeGreaterThanOrEqual(4.5);
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
      console.error(
        blockingViolations.map(({ id, help, nodes }) => ({
          id,
          help,
          targets: nodes.map((node) => node.target),
        })),
      );
    }

    expect(blockingViolations).toEqual([]);
  });
});
