import assert from 'node:assert/strict'
import { test } from 'node:test'
import { safeAuthDestination, recoveryNotice, AUTH_EMAIL_COOLDOWN_SECONDS } from '../lib/auth-recovery'
import { requestPasswordReset, updatePassword } from '../lib/supabase-auth'

test('return destinations retain safe local paths and reject redirect tricks and token URLs', () => {
  assert.equal(safeAuthDestination('/account'), '/account')
  assert.equal(safeAuthDestination('/watch?size=40'), '/watch?size=40')
  for (const target of ['https://evil.test', '//evil.test', '/\\evil.test', '/%2f%2fevil.test', '/auth/reset', '/api/auth', '/account?access_token=secret', '/watch?%74oken=abc', '/watch?%70assword=abc']) {
    assert.equal(safeAuthDestination(target), '/account', target)
  }
  assert.ok(AUTH_EMAIL_COOLDOWN_SECONDS >= 60)
  assert.match(recoveryNotice('resend-signup'), /If/)
  assert.match(recoveryNotice('reset-password'), /If/)
})

test('password recovery uses PKCE, trusted callback and bearer-only password update', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-key'
  const calls: { url: string; init?: RequestInit }[] = []
  try {
    globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return Response.json({}) }
    await requestPasswordReset('test@example.org', 'https://app.test/api/auth/recovery', 'challenge')
    assert.equal(new URL(calls[0].url).searchParams.get('redirect_to'), 'https://app.test/api/auth/recovery')
    assert.deepEqual(JSON.parse(String(calls[0].init?.body)), { email: 'test@example.org', code_challenge: 'challenge', code_challenge_method: 's256' })
    await updatePassword('private-token', 'new-password')
    assert.equal(new Headers(calls[1].init?.headers).get('Authorization'), 'Bearer private-token')
    assert.equal(calls[1].url.includes('private-token'), false)
    globalThis.fetch = async () => Response.json({ error_code: 'session_expired', msg: 'expired' }, { status: 401 })
    assert.equal((await updatePassword('expired-token', 'new-password'))?.status, 401)
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})
