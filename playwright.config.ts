import { defineConfig, devices } from "@playwright/test";

const isCi = Boolean(process.env.CI);
const baseUrl = "http://localhost:5173";

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
    command: "pnpm --filter web start",
    url: baseUrl,
    reuseExistingServer: !isCi,
    stdout: "pipe",
    stderr: "pipe",
    timeout: 120_000,
  },
});
