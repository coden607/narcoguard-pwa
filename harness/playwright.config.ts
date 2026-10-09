import { defineConfig, devices } from "@playwright/test"

// The factory harness. factory/validate.sh starts the stubbed production server first and passes
// its address in FACTORY_BASE_URL, so this config never starts or reuses a server itself.
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE

export default defineConfig({
  testDir: process.env.FACTORY_SUITE_DIR ?? "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  // Hidden scenarios report counts only, so their names never reach a log the builder can read.
  reporter: [...(process.env.FACTORY_QUIET === "1" ? [] : [["list"] as const]), ["json", { outputFile: process.env.FACTORY_REPORT ?? "../.factory/runs/report.json" }]],
  use: { baseURL: process.env.FACTORY_BASE_URL ?? "http://127.0.0.1:3100", trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Pixel 5"], ...(executablePath ? { launchOptions: { executablePath } } : {}) } }],
})
