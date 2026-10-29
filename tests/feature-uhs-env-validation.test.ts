import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const script = fileURLToPath(new URL("../scripts/validate-env.js", import.meta.url))
const UHS = ["UHS_SMART_CLIENT_ID", "UHS_SMART_AUTH_URL", "UHS_SMART_TOKEN_URL", "UHS_FHIR_BASE_URL", "UHS_SMART_SESSION_SECRET"]

// Runs the real validator with a controlled environment (every UHS name cleared first).
function run(values: Record<string, string>) {
  const env: Record<string, string> = {}
  for (const [key, value] of Object.entries(process.env)) if (value !== undefined && !UHS.includes(key)) env[key] = value
  const result = spawnSync(process.execPath, [script], { env: { ...env, ...values } as NodeJS.ProcessEnv, encoding: "utf8" })
  return { status: result.status, output: `${result.stdout}${result.stderr}` }
}

const complete = {
  UHS_SMART_CLIENT_ID: "client",
  UHS_SMART_AUTH_URL: "https://example.test/oauth2/authorize",
  UHS_SMART_TOKEN_URL: "https://example.test/oauth2/token",
  UHS_FHIR_BASE_URL: "https://example.test/FHIR/R4",
  UHS_SMART_SESSION_SECRET: "s".repeat(32),
}

test("environment validation gates partial and insecure UHS SMART configuration", () => {
  assert.equal(run({}).status, 0)
  assert.equal(run(complete).status, 0)

  const partial = run({ UHS_SMART_CLIENT_ID: "client" })
  assert.notEqual(partial.status, 0)
  assert.match(partial.output, /UHS SMART configuration is partial/)

  const insecure = run({ ...complete, UHS_SMART_TOKEN_URL: "http://example.test/token" })
  assert.notEqual(insecure.status, 0)
  assert.match(insecure.output, /UHS_SMART_TOKEN_URL must use https/)

  const shortSecret = run({ ...complete, UHS_SMART_SESSION_SECRET: "short" })
  assert.notEqual(shortSecret.status, 0)
  assert.match(shortSecret.output, /UHS_SMART_SESSION_SECRET must be at least 32 characters/)
})
