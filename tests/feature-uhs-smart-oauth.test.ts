import assert from "node:assert/strict"
import { test } from "node:test"
import { buildUhsAuthorizeUrl, openUhsSession, sealUhsSession } from "../lib/health/uhs-oauth"

const env = {
  UHS_SMART_CLIENT_ID: "client-id",
  UHS_SMART_AUTH_URL: "https://example.test/oauth2/authorize",
  UHS_SMART_TOKEN_URL: "https://example.test/oauth2/token",
  UHS_FHIR_BASE_URL: "https://example.test/FHIR/R4",
} as NodeJS.ProcessEnv

test("UHS SMART authorization uses PKCE, state, aud and read-only scopes", async () => {
  const url = new URL((await buildUhsAuthorizeUrl("https://app.test/api/health/uhs/callback", "state", "verifier-value", env))!)
  assert.equal(url.searchParams.get("response_type"), "code")
  assert.equal(url.searchParams.get("client_id"), "client-id")
  assert.equal(url.searchParams.get("state"), "state")
  assert.equal(url.searchParams.get("aud"), "https://example.test/FHIR/R4")
  assert.equal(url.searchParams.get("code_challenge_method"), "S256")
  assert.match(url.searchParams.get("scope") ?? "", /patient\/Observation\.read/)
  assert.doesNotMatch(url.searchParams.get("scope") ?? "", /write/)
})

test("short-lived FHIR session cookie payload is encrypted and expires closed", async () => {
  const secret = "x".repeat(32)
  const session = { accessToken: "sensitive-token", patient: "patient-1", expiresAt: Date.now() + 60_000 }
  const sealed = await sealUhsSession(session, secret)
  assert.equal(sealed.includes("sensitive-token"), false)
  assert.deepEqual(await openUhsSession(sealed, secret), session)
  assert.equal(await openUhsSession(sealed, "y".repeat(32)), null)
  assert.equal(await openUhsSession(await sealUhsSession({ ...session, expiresAt: Date.now() - 1 }, secret), secret), null)
})
