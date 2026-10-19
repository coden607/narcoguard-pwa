import assert from "node:assert/strict"
import { test } from "node:test"
import { resendSignup, signUp } from "../lib/supabase-auth"

test("signup confirmation uses redirect URL and PKCE challenge", async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = "https://example.supabase.co"
  process.env.SUPABASE_ANON_KEY = "test-key"
  const calls: { url: string; init?: RequestInit }[] = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return Response.json({ id: "user-1", email: "new@example.org" })
    }
    await signUp("new@example.org", "strong-password", "New User", "https://app.test/api/auth/callback", "challenge")
    const signupUrl = new URL(calls[0].url)
    assert.equal(signupUrl.pathname, "/auth/v1/signup")
    assert.equal(signupUrl.searchParams.get("redirect_to"), "https://app.test/api/auth/callback")
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
      email: "new@example.org",
      password: "strong-password",
      data: { display_name: "New User" },
      code_challenge: "challenge",
      code_challenge_method: "s256",
    })
  } finally {
    globalThis.fetch = original
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  }
})

test("resend confirmation preserves the same PKCE callback contract", async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = "https://example.supabase.co"
  process.env.SUPABASE_ANON_KEY = "test-key"
  const calls: { url: string; init?: RequestInit }[] = []
  try {
    globalThis.fetch = async (url, init) => {
      calls.push({ url: String(url), init })
      return Response.json({})
    }
    assert.equal(await resendSignup("new@example.org", "https://app.test/api/auth/callback", "challenge-2"), null)
    const resendUrl = new URL(calls[0].url)
    assert.equal(resendUrl.pathname, "/auth/v1/resend")
    assert.equal(resendUrl.searchParams.get("redirect_to"), "https://app.test/api/auth/callback")
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), {
      type: "signup",
      email: "new@example.org",
      code_challenge: "challenge-2",
      code_challenge_method: "s256",
    })
  } finally {
    globalThis.fetch = original
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  }
})
