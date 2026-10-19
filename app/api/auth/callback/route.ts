import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { PKCE_COOKIE, nameFromMetadata } from "@/lib/oauth-pkce"
import { ensureProfile, exchangeCode, isAuthConfigured, storeSession } from "@/lib/supabase-auth"
import { safeAuthDestination } from '@/lib/auth-recovery'

export const dynamic = "force-dynamic"

/** Google or email confirmation sends the person back here; PKCE exchanges the code and stores the session. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const fail = () => NextResponse.redirect(new URL("/auth?error=callback", url.origin))
  const store = await cookies()
  const verifier = store.get(PKCE_COOKIE)?.value
  const next = safeAuthDestination(store.get('ng_auth_next')?.value)
  store.delete({ name: 'ng_auth_next', path: '/api/auth' })
  store.delete({ name: PKCE_COOKIE, path: "/api/auth" })
  const code = url.searchParams.get("code")
  if (!isAuthConfigured() || !code || !verifier) return fail()
  try {
    const session = await exchangeCode(code, verifier)
    if (!session?.access_token || !session.refresh_token) return fail()
    await storeSession(session)
    await ensureProfile(session, nameFromMetadata(session.user?.user_metadata, session.user?.email))
    const response = NextResponse.redirect(new URL(next, url.origin))
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  } catch {
    return fail()
  }
}
