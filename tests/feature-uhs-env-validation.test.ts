import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("environment validation gates partial and insecure UHS SMART configuration", async () => {
  const source = await readFile(new URL("../scripts/validate-env.js", import.meta.url), "utf8")
  assert.match(source, /UHS SMART configuration is partial/)
  assert.match(source, /UHS_SMART_SESSION_SECRET must be at least 32 characters/)
  assert.match(source, /must use https/)
  assert.match(source, /UHS_SMART_AUTH_URL/)
  assert.match(source, /UHS_SMART_TOKEN_URL/)
  assert.match(source, /UHS_FHIR_BASE_URL/)
})
