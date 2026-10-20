import assert from "node:assert/strict"
import { test } from "node:test"
import { getUhsSmartConfig, UHS_SMART_SCOPES } from "../lib/health/uhs-mychart"

test("UHS connector stays disabled until every exact SMART registration value is present", () => {
  assert.equal(getUhsSmartConfig({} as NodeJS.ProcessEnv).configured, false)
  assert.equal(getUhsSmartConfig({
    UHS_SMART_CLIENT_ID: "client",
    UHS_SMART_AUTH_URL: "https://example.test/authorize",
    UHS_SMART_TOKEN_URL: "https://example.test/token",
    UHS_FHIR_BASE_URL: "https://example.test/fhir",
  } as NodeJS.ProcessEnv).configured, true)
})

test("UHS connector rejects guessed or insecure endpoints and stays read-only", () => {
  assert.equal(getUhsSmartConfig({
    UHS_SMART_CLIENT_ID: "client",
    UHS_SMART_AUTH_URL: "http://example.test/authorize",
    UHS_SMART_TOKEN_URL: "https://example.test/token",
    UHS_FHIR_BASE_URL: "https://example.test/fhir",
  } as NodeJS.ProcessEnv).configured, false)
  assert.ok(UHS_SMART_SCOPES.every(scope => !scope.includes(".write")))
  assert.ok(UHS_SMART_SCOPES.every(scope => !scope.includes("*.")))
})
