import assert from "node:assert/strict"
import { test } from "node:test"
import { authorizeUrl, challengeFor, createVerifier, nameFromMetadata } from "../lib/oauth-pkce"

test("verifier is 43 url-safe characters and unique", () => {
  const a = createVerifier(), b = createVerifier()
  assert.match(a, /^[A-Za-z0-9_-]{43}$/)
  assert.notEqual(a, b)
})

test("S256 challenge matches the RFC 7636 example", async () => {
  assert.equal(await challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"), "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
})

test("authorize URL carries provider, redirect and challenge", () => {
  const url = new URL(authorizeUrl("https://x.supabase.co/", "google", "https://www.narcoguard.app/api/auth/callback", "abc"))
  assert.equal(url.origin + url.pathname, "https://x.supabase.co/auth/v1/authorize")
  assert.equal(url.searchParams.get("provider"), "google")
  assert.equal(url.searchParams.get("redirect_to"), "https://www.narcoguard.app/api/auth/callback")
  assert.equal(url.searchParams.get("code_challenge"), "abc")
  assert.equal(url.searchParams.get("code_challenge_method"), "s256")
})

test("name comes from Google metadata, else the email name", () => {
  assert.equal(nameFromMetadata({ full_name: " Sam Lee " }, "s@x.org"), "Sam Lee")
  assert.equal(nameFromMetadata({ name: "Sam" }, undefined), "Sam")
  assert.equal(nameFromMetadata({}, "sam.lee@x.org"), "sam.lee")
  assert.equal(nameFromMetadata(undefined, undefined), "NarcoGuard user")
})
