import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { isSameAuthOrigin, RECOVERY_TOKEN_COOKIE } from '@/lib/auth-recovery'
import { clearSession, revokeRecoverySession, updatePassword } from '@/lib/supabase-auth'

const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }
export async function GET() {
  const store = await cookies()
  return NextResponse.json({ ready: Boolean(store.get(RECOVERY_TOKEN_COOKIE)?.value) }, { headers })
}

export async function POST(request: Request) {
  if (!isSameAuthOrigin(request)) return NextResponse.json({ error: 'Cross-origin request rejected' }, { status: 403, headers })
  const store = await cookies()
  const token = store.get(RECOVERY_TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'This reset link has expired or was already used. Request a new link.', code: 'expired' }, { status: 401, headers })
  try {
    const { password } = z.object({ password: z.string().min(8).max(128) }).parse(await request.json())
    const error = await updatePassword(token, password)
    if (error) {
      if (error.status === 401 || error.status === 403) {
        store.delete({ name: RECOVERY_TOKEN_COOKIE, path: '/api/auth/password' })
        return NextResponse.json({ error: 'This reset link has expired. Request a new link.', code: 'expired' }, { status: 401, headers })
      }
      return NextResponse.json({ error: 'Unable to change your password. Choose a different password or try again.' }, { status: 400, headers })
    }
    store.delete({ name: RECOVERY_TOKEN_COOKIE, path: '/api/auth/password' })
    await clearSession()
    try { await revokeRecoverySession(token) } catch { /* Password is already updated. Never report a false failure. */ }
    return NextResponse.json({ success: true }, { headers })
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? 'Use a password between 8 and 128 characters.' : 'Password service is unavailable. Try again.' }, { status: error instanceof z.ZodError ? 400 : 503, headers })
  }
}
