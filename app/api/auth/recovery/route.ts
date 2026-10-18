import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { RECOVERY_MAX_AGE_SECONDS, RECOVERY_TOKEN_COOKIE, RECOVERY_VERIFIER_COOKIE } from '@/lib/auth-recovery'
import { exchangeCode } from '@/lib/supabase-auth'

export const dynamic = 'force-dynamic'

/** Exchange a one-use recovery code. No token is exposed to JavaScript or forwarded. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const store = await cookies()
  const verifier = store.get(RECOVERY_VERIFIER_COOKIE)?.value
  store.delete({ name: RECOVERY_VERIFIER_COOKIE, path: '/api/auth' })
  store.delete({ name: RECOVERY_TOKEN_COOKIE, path: '/api/auth/password' })
  let valid = false
  try {
    const code = url.searchParams.get('code')
    if (code && verifier && !url.searchParams.has('error')) {
      const session = await exchangeCode(code, verifier)
      if (session?.access_token) {
        store.set(RECOVERY_TOKEN_COOKIE, session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth/password', maxAge: Math.min(RECOVERY_MAX_AGE_SECONDS, session.expires_in ?? RECOVERY_MAX_AGE_SECONDS) })
        valid = true
      }
    }
  } catch { /* Expired or unusable links show the same safe recovery state. */ }
  const response = NextResponse.redirect(new URL(valid ? '/auth/reset' : '/auth/reset?error=expired', url.origin))
  response.headers.set('Cache-Control', 'private, no-store')
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
