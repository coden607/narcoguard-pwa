import 'next/dist/server/node-environment'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { test } from 'node:test'
import { NextRequest } from 'next/server'
import { createRequestStoreForAPI } from 'next/dist/server/async-storage/request-store'
import { workUnitAsyncStorage } from 'next/dist/server/app-render/work-unit-async-storage.external'
import { workAsyncStorage, type WorkStore } from 'next/dist/server/app-render/work-async-storage.external'
import { GET as authStatus } from '../app/api/auth/route'
import { GET as startGoogle } from '../app/api/auth/google/route'
import { GET as googleCallback } from '../app/api/auth/callback/google/route'
import { GET as startApple } from '../app/api/auth/apple/route'
import { POST as appleCallback } from '../app/api/auth/callback/apple/route'
import { APPLE_NEXT_COOKIE, APPLE_STATE_COOKIE, GOOGLE_NEXT_COOKIE, GOOGLE_PKCE_COOKIE, challengeFor } from '../lib/oauth-pkce'
import { googleAuthorizeUrl, hasAppleOAuthCredentials, hasGoogleOAuthCredentials, profileFromIdToken } from '../lib/google-oauth'
import { googleRedirectUri, publicAuthOrigin, sessionCookieOptions } from '../lib/auth-origin'
import { ACCESS_COOKIE, REFRESH_COOKIE, getAuthContext, isAppleSignInEnabled, isGoogleSignInEnabled } from '../lib/supabase-auth'

function inRequest<T>(request: NextRequest, run: () => Promise<T>) {
  const url = new URL(request.url)
  const store = createRequestStoreForAPI(request, { pathname: url.pathname, search: url.search }, { tags: [], expirationsByCacheKind: new Map() }, undefined, undefined, undefined)
  return workAsyncStorage.run({ route: url.pathname, isStaticGeneration: false } as unknown as WorkStore, () => workUnitAsyncStorage.run(store, async () => ({ result: await run(), cookies: store.mutableCookies })))
}

function withAuthEnv(run: () => Promise<void>) {
  const previous = { ...process.env }
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-key'
  process.env.AUTH_GOOGLE_ID = 'google-client-id.apps.googleusercontent.com'
  process.env.AUTH_GOOGLE_SECRET = 'google-client-secret'
  return run().finally(() => {
    for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET', 'AUTH_APPLE_ID', 'AUTH_APPLE_SECRET', 'AUTH_APPLE_TEAM_ID', 'AUTH_APPLE_KEY_ID', 'AUTH_APPLE_ENABLED', 'AUTH_URL', 'NEXT_PUBLIC_APP_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
  })
}

test('Google and Apple buttons stay hidden until their credentials are set', () => {
  delete process.env.AUTH_GOOGLE_ID
  delete process.env.AUTH_GOOGLE_SECRET
  delete process.env.AUTH_APPLE_ID
  delete process.env.AUTH_APPLE_SECRET
  delete process.env.AUTH_APPLE_TEAM_ID
  delete process.env.AUTH_APPLE_KEY_ID
  delete process.env.AUTH_APPLE_ENABLED
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-key'
  try {
    assert.equal(hasGoogleOAuthCredentials(), false)
    assert.equal(isGoogleSignInEnabled(), false)
    assert.equal(hasAppleOAuthCredentials(), false)
    assert.equal(isAppleSignInEnabled(), false)
  } finally {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  }
})

test('GET /api/auth reports google when credentials exist and apple only with the flag', async () => {
  await withAuthEnv(async () => {
    const request = new NextRequest('https://app.test/api/auth')
    const enabled = await inRequest(request, () => authStatus(request))
    const body = await enabled.result.json()
    assert.equal(body.google, true)
    assert.equal(body.apple, false)
    process.env.AUTH_APPLE_ENABLED = 'true'
    process.env.AUTH_APPLE_ID = 'apple-id'
    process.env.AUTH_APPLE_SECRET = 'apple-secret'
    process.env.AUTH_APPLE_TEAM_ID = 'apple-team'
    process.env.AUTH_APPLE_KEY_ID = 'apple-key'
    const withApple = await inRequest(request, () => authStatus(request))
    assert.equal((await withApple.result.json()).apple, true)
  })
})

test('Google start sends the person to Google with the exact www callback when on the live domain', async () => {
  await withAuthEnv(async () => {
    const request = new NextRequest('https://www.narcoguard.app/api/auth/google?next=/account')
    const outcome = await inRequest(request, () => startGoogle(request))
    const location = outcome.result.headers.get('location')
    assert.ok(location)
    const url = new URL(location)
    assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth')
    assert.equal(url.searchParams.get('client_id'), 'google-client-id.apps.googleusercontent.com')
    assert.equal(url.searchParams.get('redirect_uri'), 'https://www.narcoguard.app/api/auth/callback/google')
    assert.equal(url.searchParams.get('response_type'), 'code')
    assert.equal(url.searchParams.get('code_challenge_method'), 'S256')
    assert.ok(url.searchParams.get('code_challenge'))
    assert.ok(url.searchParams.get('state'))
    assert.equal(outcome.result.cookies.get(GOOGLE_PKCE_COOKIE)?.httpOnly, true)
    assert.equal(outcome.result.cookies.get(GOOGLE_NEXT_COOKIE)?.value, '/account')
    assert.equal(outcome.result.cookies.get('ng_auth_google_state')?.value, url.searchParams.get('state'))
  })
})

test('Google start stays off and does not leak a redirect to Google when credentials are missing', async () => {
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-key'
  delete process.env.AUTH_GOOGLE_ID
  delete process.env.AUTH_GOOGLE_SECRET
  try {
    const request = new NextRequest('https://www.narcoguard.app/api/auth/google')
    const outcome = await inRequest(request, () => startGoogle(request))
    assert.equal(outcome.result.headers.get('location'), 'https://www.narcoguard.app/auth?error=google-off')
  } finally {
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_ANON_KEY
  }
})

test('Apple start stays off by default', async () => {
  const request = new NextRequest('https://www.narcoguard.app/api/auth/apple')
  const outcome = await inRequest(request, () => startApple(request))
  assert.equal(outcome.result.headers.get('location'), 'https://www.narcoguard.app/auth?error=apple-off')
})

test('Apple start sends the person to Apple with the exact www callback when enabled', async () => {
  await withAuthEnv(async () => {
    process.env.AUTH_APPLE_ENABLED = 'true'
    process.env.AUTH_APPLE_ID = 'app.narcoguard.web'
    process.env.AUTH_APPLE_SECRET = 'apple-secret'
    process.env.AUTH_APPLE_TEAM_ID = 'apple-team'
    process.env.AUTH_APPLE_KEY_ID = 'apple-key'
    const request = new NextRequest('https://www.narcoguard.app/api/auth/apple?next=/account')
    const outcome = await inRequest(request, () => startApple(request))
    const location = outcome.result.headers.get('location')
    assert.ok(location)
    const url = new URL(location)
    assert.equal(url.origin + url.pathname, 'https://appleid.apple.com/auth/authorize')
    assert.equal(url.searchParams.get('client_id'), 'app.narcoguard.web')
    assert.equal(url.searchParams.get('redirect_uri'), 'https://www.narcoguard.app/api/auth/callback/apple')
    assert.equal(url.searchParams.get('response_type'), 'code')
    assert.equal(url.searchParams.get('response_mode'), 'form_post')
    assert.ok(url.searchParams.get('state'))
    assert.equal(outcome.result.cookies.get(APPLE_STATE_COOKIE)?.httpOnly, true)
    assert.equal(outcome.result.cookies.get(APPLE_NEXT_COOKIE)?.value, '/account')
    assert.equal(outcome.result.cookies.get(APPLE_STATE_COOKIE)?.value, url.searchParams.get('state'))
  })
})

test('Apple callback writes session cookies onto the redirect when Apple and Supabase succeed', async () => {
  await withAuthEnv(async () => {
    process.env.AUTH_URL = 'https://www.narcoguard.app'
    process.env.AUTH_APPLE_ENABLED = 'true'
    process.env.AUTH_APPLE_ID = 'app.narcoguard.web'
    process.env.AUTH_APPLE_TEAM_ID = 'apple-team'
    process.env.AUTH_APPLE_KEY_ID = 'apple-key'
    const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
    process.env.AUTH_APPLE_SECRET = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
    const original = globalThis.fetch
    const state = 'csrf-state-token'
    // A structurally valid JWT payload {email} — signature is not checked because the token is taken from Apple's token endpoint.
    const idToken = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ email: 'user@example.invalid' })).toString('base64url')}.sig`
    try {
      globalThis.fetch = async (input, init) => {
        const url = String(input)
        if (url === 'https://appleid.apple.com/auth/token') {
          const body = String(init?.body)
          assert.ok(body.includes('code=auth-code'))
          assert.ok(body.includes('grant_type=authorization_code'))
          assert.ok(body.includes('redirect_uri=' + encodeURIComponent('https://www.narcoguard.app/api/auth/callback/apple')))
          assert.ok(body.includes('client_secret='))
          return Response.json({ id_token: idToken, access_token: 'apple-access' })
        }
        if (url.includes('/auth/v1/token?grant_type=id_token')) {
          return Response.json({
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            user: { id: 'fixture-user', email: 'user@example.invalid', user_metadata: { full_name: 'Sam Lee' } },
          })
        }
        return Response.json({}, { status: 200 })
      }
      const form = new URLSearchParams({ code: 'auth-code', state, user: JSON.stringify({ name: { firstName: 'Sam', lastName: 'Lee' }, email: 'user@example.invalid' }) })
      const request = new NextRequest('https://www.narcoguard.app/api/auth/callback/apple', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: `${APPLE_STATE_COOKIE}=${state}; ${APPLE_NEXT_COOKIE}=/account` },
        body: form.toString(),
      })
      const outcome = await inRequest(request, () => appleCallback(request))
      assert.equal(outcome.result.headers.get('location'), 'https://www.narcoguard.app/account')
      assert.equal(outcome.cookies.get(ACCESS_COOKIE)?.value, 'access-token')
      assert.equal(outcome.cookies.get(ACCESS_COOKIE)?.httpOnly, true)
      assert.equal(outcome.cookies.get(REFRESH_COOKIE)?.value, 'refresh-token')
    } finally {
      globalThis.fetch = original
    }
  })
})

test('Google callback writes session cookies onto the redirect when Google and Supabase succeed', async () => {
  await withAuthEnv(async () => {
    process.env.AUTH_URL = 'https://www.narcoguard.app'
    const original = globalThis.fetch
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'
    const state = 'csrf-state-token'
    // A structurally valid JWT payload {email,name} — signature is not checked because the token is taken from Google's token endpoint.
    const idToken = `eyJhbGciOiJub25lIn0.${Buffer.from(JSON.stringify({ email: 'user@example.invalid', name: 'Sam Lee' })).toString('base64url')}.sig`
    try {
      globalThis.fetch = async (input, init) => {
        const url = String(input)
        if (url === 'https://oauth2.googleapis.com/token') {
          const body = String(init?.body)
          assert.ok(body.includes('code=auth-code'))
          assert.ok(body.includes('code_verifier=' + verifier))
          assert.ok(body.includes('redirect_uri=' + encodeURIComponent('https://www.narcoguard.app/api/auth/callback/google')))
          return Response.json({ id_token: idToken, access_token: 'google-access' })
        }
        if (url.includes('/auth/v1/token?grant_type=id_token')) {
          return Response.json({
            access_token: 'access-token',
            refresh_token: 'refresh-token',
            expires_in: 3600,
            user: { id: 'fixture-user', email: 'user@example.invalid', user_metadata: { full_name: 'Sam Lee' } },
          })
        }
        return Response.json({}, { status: 200 })
      }
      const request = new NextRequest('https://www.narcoguard.app/api/auth/callback/google?code=auth-code&state=' + state, {
        headers: { Cookie: `${GOOGLE_PKCE_COOKIE}=${verifier}; ng_auth_google_state=${state}; ${GOOGLE_NEXT_COOKIE}=/account` },
      })
      const outcome = await inRequest(request, () => googleCallback(request))
      assert.equal(outcome.result.headers.get('location'), 'https://www.narcoguard.app/account')
      assert.equal(outcome.cookies.get(ACCESS_COOKIE)?.value, 'access-token')
      assert.equal(outcome.cookies.get(ACCESS_COOKIE)?.httpOnly, true)
      assert.equal(outcome.cookies.get(REFRESH_COOKIE)?.value, 'refresh-token')
      assert.equal(outcome.cookies.get(REFRESH_COOKIE)?.maxAge, 60 * 60 * 24 * 30)
      assert.equal(outcome.cookies.get(REFRESH_COOKIE)?.domain, '.narcoguard.app')
    } finally {
      globalThis.fetch = original
    }
  })
})

test('a successful refresh rotates the session; a transient failure keeps the refresh cookie', async () => {
  await withAuthEnv(async () => {
    const original = globalThis.fetch
    try {
      globalThis.fetch = async (input) => {
        const url = String(input)
        if (url.includes('/auth/v1/user')) return Response.json({ error: 'expired' }, { status: 401 })
        if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
          return Response.json({
            access_token: 'new-access',
            refresh_token: 'new-refresh',
            expires_in: 3600,
            user: { id: 'fixture-user', email: 'user@example.invalid' },
          })
        }
        return Response.json({}, { status: 500 })
      }
      const request = new NextRequest('https://app.test/api/auth', { headers: { Cookie: 'ng_access_token=stale; ng_refresh_token=still-valid' } })
      const refreshed = await inRequest(request, () => getAuthContext())
      assert.equal(refreshed.result?.accessToken, 'new-access')
      assert.equal(refreshed.cookies.get(ACCESS_COOKIE)?.value, 'new-access')
      assert.equal(refreshed.cookies.get(REFRESH_COOKIE)?.value, 'new-refresh')

      let refreshCalls = 0
      globalThis.fetch = async (input) => {
        const url = String(input)
        if (url.includes('/auth/v1/user')) return Response.json({ error: 'expired' }, { status: 401 })
        if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
          refreshCalls += 1
          return Response.json({ error: 'unavailable' }, { status: 503 })
        }
        return Response.json({}, { status: 500 })
      }
      const transient = new NextRequest('https://app.test/api/auth', { headers: { Cookie: 'ng_access_token=stale; ng_refresh_token=still-valid' } })
      const kept = await inRequest(transient, () => getAuthContext())
      assert.equal(kept.result, null)
      assert.equal(refreshCalls, 1)
      assert.equal(kept.cookies.get(REFRESH_COOKIE)?.value, 'still-valid')
    } finally {
      globalThis.fetch = original
    }
  })
})

test('concurrent refreshes share one token exchange', async () => {
  await withAuthEnv(async () => {
    const original = globalThis.fetch
    let refreshCalls = 0
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    try {
      globalThis.fetch = async (input) => {
        const url = String(input)
        if (url.includes('/auth/v1/user')) return Response.json({ error: 'expired' }, { status: 401 })
        if (url.includes('/auth/v1/token?grant_type=refresh_token')) {
          refreshCalls += 1
          await gate
          return Response.json({
            access_token: 'shared-access',
            refresh_token: 'shared-refresh',
            expires_in: 3600,
            user: { id: 'fixture-user', email: 'user@example.invalid' },
          })
        }
        return Response.json({}, { status: 500 })
      }
      const requestA = new NextRequest('https://app.test/api/auth', { headers: { Cookie: 'ng_access_token=stale; ng_refresh_token=shared' } })
      const requestB = new NextRequest('https://app.test/api/auth', { headers: { Cookie: 'ng_access_token=stale; ng_refresh_token=shared' } })
      const pending = Promise.all([
        inRequest(requestA, () => getAuthContext()),
        inRequest(requestB, () => getAuthContext()),
      ])
      await new Promise((resolve) => setTimeout(resolve, 20))
      release()
      const [a, b] = await pending
      assert.equal(refreshCalls, 1)
      assert.equal(a.result?.accessToken, 'shared-access')
      assert.equal(b.result?.accessToken, 'shared-access')
    } finally {
      release()
      globalThis.fetch = original
    }
  })
})

test('canonical production origin and cookie domain, and Google authorize URL stay exact', () => {
  assert.equal(publicAuthOrigin(new Request('https://narcoguard.app/api/auth/google')), 'https://www.narcoguard.app')
  assert.equal(publicAuthOrigin(new Request('https://www.narcoguard.app/api/auth/google')), 'https://www.narcoguard.app')
  assert.equal(publicAuthOrigin(new Request('https://narcoguard-pwa-abc.vercel.app/api/auth/google')), 'https://narcoguard-pwa-abc.vercel.app')
  assert.equal(googleRedirectUri('https://www.narcoguard.app'), 'https://www.narcoguard.app/api/auth/callback/google')
  process.env.AUTH_URL = 'https://www.narcoguard.app'
  try {
    const options = sessionCookieOptions(60)
    assert.equal(options.domain, '.narcoguard.app')
    assert.equal(options.secure, true)
    assert.equal(options.sameSite, 'lax')
    assert.equal(options.httpOnly, true)
    assert.equal(options.path, '/')
  } finally {
    delete process.env.AUTH_URL
  }
  const url = new URL(googleAuthorizeUrl({
    clientId: 'id',
    redirectUri: 'https://www.narcoguard.app/api/auth/callback/google',
    challenge: 'abc',
    state: 'state',
  }))
  assert.equal(url.searchParams.get('redirect_uri'), 'https://www.narcoguard.app/api/auth/callback/google')
  assert.equal(profileFromIdToken(`x.${Buffer.from(JSON.stringify({ email: 'a@b.c', name: 'Ann' })).toString('base64url')}.y`).email, 'a@b.c')
  void challengeFor
})
