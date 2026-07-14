const { spawnSync } = require("node:child_process")

const script = process.platform === "android" ? "test-pwa-android.js" : null
const args = script
  ? [require.resolve(`./${script}`)]
  : [require.resolve("@playwright/test/cli"), "test", "tests/pwa.spec.ts", "--project=chromium"]

if (script) {
  console.log("[pwa] Android detected; running the production PWA smoke suite.")
}

const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env })
if (result.error) throw result.error
process.exit(result.status ?? 1)
