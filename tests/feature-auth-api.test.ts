import 'next/dist/server/node-environment'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { createRequestStoreForAPI } from 'next/dist/server/async-storage/request-store'
import { workUnitAsyncStorage } from 'next/dist/server/app-render/work-unit-async-storage.external'
import { workAsyncStorage, type WorkStore } from 'next/dist/server/app-render/work-async-storage.external'
import { GET, POST } from '../app/api/auth/route'
import { GET as recoveryCallback } from '../app/api/auth/recovery/route'
import { POST as changePassword } from '../app/api/auth/password/route'
import { EMAIL_NEXT_COOKIE, EMAIL_PKCE_COOKIE, challengeFor } from '../lib/oauth-pkce'

// Run the real route handlers in Next's request cookie context, intercepting only
// the external Supabase edge. This exercises server authorization and cookie writes.
function inRequest<T>(request: NextRequest, run: () => Promise<T>) {
  const url = new URL(request.url)
  const store = createRequestStoreForAPI(request, { pathname: url.pathname, search: url.search }, { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined, undefined)
  return workAsyncStorage.run({ route: url.pathname, isStaticGeneration: false } as unknown as WorkStore, () => workUnitAsyncStorage.run(store, async () => ({ result: await run(), cookies: store.mutableCookies })))
}
const requestFor = (body: unknown, cookie = '') => new NextRequest('https://app.test/api/auth', { method: 'POST', headers: { Origin: 'https://app.test', Cookie: cookie, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })


test('successful login stores an httpOnly session and returns the safe destination', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'test-key'
  try {
    globalThis.fetch = async () => Response.json({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
      expires_in: 3600,
      user: { id: 'fixture-user', email: 'user@example.invalid' },
    })
    const request = requestFor({ action: 'login', email: 'user@example.invalid', password: 'fixture-password', next: '/watch' })
    const outcome = await inRequest(request, () => POST(request))
    assert.equal(outcome.result.status, 200)
    const body = await outcome.result.json()
    assert.equal(body.success, true)
    assert.equal(body.next, '/watch')
    assert.equal(outcome.cookies.get('ng_access_token')?.httpOnly, true)
    assert.equal(outcome.cookies.get('ng_access_token')?.value, 'access-token')
    assert.equal(outcome.cookies.get('ng_refresh_token')?.httpOnly, true)
    assert.equal(outcome.cookies.get('ng_refresh_token')?.value, 'refresh-token')
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})

test('rejected or interrupted signup preserves an outstanding confirmation verifier and destination', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'test-key'
  try {
    for (const status of [429, 422, 0]) {
      globalThis.fetch = async () => {
        if (!status) throw new Error('fixture network interruption')
        return Response.json({ error_code: status === 429 ? 'over_request_rate_limit' : 'weak_password', msg: 'Request rejected' }, { status })
      }
      const request = requestFor({ action: 'signup', email: 'second@example.invalid', password: 'fixture-password', displayName: 'Fixture', next: '/watch' }, `${EMAIL_PKCE_COOKIE}=previous-verifier; ${EMAIL_NEXT_COOKIE}=/planning`)
      const outcome = await inRequest(request, () => POST(request))
      assert.ok(outcome.result.status >= 400)
      assert.equal(outcome.cookies.get(EMAIL_PKCE_COOKIE)?.value, 'previous-verifier')
      assert.equal(outcome.cookies.get(EMAIL_NEXT_COOKIE)?.value, '/planning')
    }
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})

test('obfuscated signup success preserves the outstanding confirmation without disclosing account state', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'test-key'
  try {
    for (const identities of [[], undefined]) {
      globalThis.fetch = async () => Response.json({ id: 'obfuscated-user', email: 'existing@example.invalid', identities })
      const request = requestFor({ action: 'signup', email: 'existing@example.invalid', password: 'fixture-password', displayName: 'Fixture', next: '/watch' }, `${EMAIL_PKCE_COOKIE}=previous-verifier; ${EMAIL_NEXT_COOKIE}=/planning`)
      const outcome = await inRequest(request, () => POST(request))
      assert.equal(outcome.result.status, 202)
      assert.deepEqual(await outcome.result.json(), { success: true, confirmationRequired: true, message: 'If this address has an unconfirmed account, a confirmation email will arrive. Check your inbox and spam folder.' })
      assert.equal(outcome.cookies.get(EMAIL_PKCE_COOKIE)?.value, 'previous-verifier')
      assert.equal(outcome.cookies.get(EMAIL_NEXT_COOKIE)?.value, '/planning')
    }
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})

test('accepted signup replaces the confirmation verifier with the accepted PKCE challenge', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'test-key'
  let challenge = ''
  try {
    globalThis.fetch = async (_url, init) => {
      challenge = JSON.parse(String(init?.body)).code_challenge
      return Response.json({ id: 'fixture-user', email: 'new@example.invalid', identities: [{ provider: 'email' }] })
    }
    const request = requestFor({ action: 'signup', email: 'new@example.invalid', password: 'fixture-password', displayName: 'Fixture', next: '/watch' }, `${EMAIL_PKCE_COOKIE}=previous-verifier; ${EMAIL_NEXT_COOKIE}=/planning`)
    const outcome = await inRequest(request, () => POST(request))
    assert.equal(outcome.result.status, 202)
    const verifier = outcome.cookies.get(EMAIL_PKCE_COOKIE)
    assert.ok(verifier?.value && verifier.value !== 'previous-verifier')
    assert.equal(verifier.httpOnly, true)
    assert.equal(verifier.path, '/api/auth')
    assert.equal(await challengeFor(verifier.value), challenge)
    assert.equal(outcome.cookies.get(EMAIL_NEXT_COOKIE)?.value, '/watch')
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})

test('resend hides provider account state and enforces browser cooldown before sending', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'test-key'
  let sends = 0
  try {
    globalThis.fetch = async () => { sends++; return Response.json({ error_code: 'user_not_found', msg: 'unknown account' }, { status: 404 }) }
    const request = requestFor({ action: 'resend-signup', email: 'unknown@example.invalid' })
    const first = await inRequest(request, () => POST(request))
    assert.equal(first.result.status, 200)
    const generic = await first.result.json()
    assert.match(generic.message, /^If this address/)
    assert.equal(JSON.stringify(generic).includes('user_not_found'), false)
    const until = first.cookies.get('ng_auth_email_cooldown')?.value
    const repeated = requestFor({ action: 'resend-signup', email: 'corrected@example.invalid' }, `ng_auth_email_cooldown=${until}`)
    const next = await inRequest(repeated, () => POST(repeated))
    assert.equal(next.result.status, 429)
    assert.equal(sends, 1)
    globalThis.fetch = async () => Response.json({})
    const known = requestFor({ action: 'resend-signup', email: 'known@example.invalid' })
    assert.deepEqual(await (await inRequest(known, () => POST(known))).result.json(), generic)
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})

test('reset callback consumes browser verifier, strips code and password endpoint requires recovery cookie', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'test-key'
  try {
    let exchanges = 0
    globalThis.fetch = async () => { exchanges++; return Response.json({ access_token: 'temporary', refresh_token: 'unused', expires_in: 600 }) }
    const missing = new NextRequest('https://app.test/api/auth/recovery?code=one-use-code')
    const rejected = await inRequest(missing, () => recoveryCallback(missing))
    assert.equal(rejected.result.headers.get('location'), 'https://app.test/auth/reset?error=expired')
    assert.equal(exchanges, 0)
    const valid = new NextRequest('https://app.test/api/auth/recovery?code=one-use-code', { headers: { Cookie: 'ng_recovery_verifier=browser-verifier' } })
    const accepted = await inRequest(valid, () => recoveryCallback(valid))
    assert.equal(accepted.result.headers.get('location'), 'https://app.test/auth/reset')
    assert.equal(accepted.cookies.get('ng_recovery_verifier')?.value, '')
    assert.equal(accepted.cookies.get('ng_recovery_token')?.httpOnly, true)
    assert.equal(accepted.cookies.get('ng_recovery_token')?.path, '/api/auth/password')
    assert.equal(accepted.cookies.get('ng_recovery_token')?.maxAge, 600)
    assert.equal(accepted.cookies.get('ng_access_token'), undefined)
    const noToken = requestFor({ password: 'new-password' })
    assert.equal((await inRequest(noToken, () => changePassword(noToken))).result.status, 401)
    globalThis.fetch = async () => Response.json({ error_code: 'session_expired' }, { status: 401 })
    const expired = requestFor({ password: 'new-password' }, 'ng_recovery_token=expired')
    const result = await inRequest(expired, () => changePassword(expired))
    assert.equal(result.result.status, 401)
    assert.equal(result.cookies.get('ng_recovery_token')?.value, '')
    globalThis.fetch = async () => Response.json({})
    const success = requestFor({ password: 'new-password' }, 'ng_recovery_token=temporary')
    const updated = await inRequest(success, () => changePassword(success))
    assert.equal(updated.result.status, 200)
    assert.equal(updated.cookies.get('ng_recovery_token')?.value, '')
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})

test('expired sessions clear stale cookies and return only a safe local destination', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'test-key'
  try {
    globalThis.fetch = async () => Response.json({ error: 'expired' }, { status: 401 })
    const request = new NextRequest('https://app.test/api/auth?next=https://evil.test', { headers: { Cookie: 'ng_access_token=stale; ng_refresh_token=expired' } })
    const result = await inRequest(request, () => GET(request))
    const body = await result.result.json()
    assert.equal(body.authenticated, false)
    assert.equal(body.sessionExpired, true)
    assert.equal(body.recoveryUrl, '/auth?reason=expired&next=%2Faccount')
    assert.equal(result.cookies.get('ng_access_token')?.value, '')
    assert.equal(result.cookies.get('ng_refresh_token')?.value, '')
    assert.equal(result.result.headers.get('cache-control'), 'private, no-store')
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})
