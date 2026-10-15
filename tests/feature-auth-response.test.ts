import assert from 'node:assert/strict'
import { test } from 'node:test'
import { signUp, signIn } from '../lib/supabase-auth'

test('confirmation-required signup recognizes the raw Auth user response', async () => {
  const original = globalThis.fetch
  process.env.SUPABASE_URL = 'https://example.supabase.co'
  process.env.SUPABASE_ANON_KEY = 'test-key'
  try {
    globalThis.fetch = async () => Response.json({ id: 'user-1', email: 'test@example.org', confirmation_sent_at: '2026-10-15' })
    const result = await signUp('test@example.org', 'password123', 'Test')
    assert.equal(result.user?.id, 'user-1')
    assert.equal(result.session, null)
    assert.equal(result.error, null)
    globalThis.fetch = async () => Response.json({ access_token: 'access', refresh_token: 'refresh', user: { id: 'user-1' } })
    assert.equal((await signIn('test@example.org', 'password123')).session?.access_token, 'access')
    globalThis.fetch = async () => Response.json({ error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, { status: 400 })
    assert.equal((await signIn('test@example.org', 'wrong')).error?.code, 'invalid_credentials')
  } finally { globalThis.fetch = original; delete process.env.SUPABASE_URL; delete process.env.SUPABASE_ANON_KEY }
})
