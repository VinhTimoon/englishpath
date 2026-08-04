import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const configuredPort = process.env.ENGLISHPATH_E2E_PORT;
const e2ePort =
  configuredPort && /^\d{2,5}$/u.test(configuredPort) ? configuredPort : "4173";
const baseUrl = `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  outputDir: "./node_modules/.cache/playwright/test-results",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  reporter: isCi ? [["list"], ["github"]] : [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: baseUrl,
    headless: true,
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "off",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: {
    command: `pnpm --filter web exec next start --port ${e2ePort}`,
    url: baseUrl,
    reuseExistingServer: !isCi,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
});
