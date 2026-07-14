const path = require("node:path")
const { spawnSync } = require("node:child_process")

const env = { ...process.env }

if (process.platform === "android" && !env.NEXT_TEST_WASM_DIR) {
  env.NEXT_TEST_WASM_DIR = path.dirname(require.resolve("@next/swc-wasm-nodejs/wasm.js"))
  console.log("[build] Android detected; using the matching Next.js WASM compiler.")
}

const result = spawnSync(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  env,
  stdio: "inherit",
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
