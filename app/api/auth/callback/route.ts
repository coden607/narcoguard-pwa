import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { EMAIL_NEXT_COOKIE, EMAIL_PKCE_COOKIE, GOOGLE_NEXT_COOKIE, GOOGLE_PKCE_COOKIE, nameFromMetadata } from "@/lib/oauth-pkce"
import { attachSession, ensureProfile, exchangeCode, isAuthConfigured, storeSession } from "@/lib/supabase-auth"
import { publicAuthOrigin } from "@/lib/auth-origin"
import { safeAuthDestination } from '@/lib/auth-recovery'

export const dynamic = "force-dynamic"

/** Google or email confirmation sends the person back here; PKCE exchanges the code and stores the session. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const flow = url.searchParams.get("flow") === "google" ? "google" : "email"
  const verifierCookie = flow === "google" ? GOOGLE_PKCE_COOKIE : EMAIL_PKCE_COOKIE
  const nextCookie = flow === "google" ? GOOGLE_NEXT_COOKIE : EMAIL_NEXT_COOKIE
  const origin = publicAuthOrigin(request)
  const fail = () => NextResponse.redirect(new URL(`/auth?error=${flow === "google" ? "google" : "email-confirmation"}`, origin))
  const store = await cookies()
  const verifier = store.get(verifierCookie)?.value
  const next = safeAuthDestination(store.get(nextCookie)?.value)
  store.delete({ name: nextCookie, path: '/api/auth' })
  store.delete({ name: verifierCookie, path: "/api/auth" })
  const code = url.searchParams.get("code")
  if (!isAuthConfigured() || !code || !verifier) return fail()
  try {
    const session = await exchangeCode(code, verifier)
    if (!session?.access_token || !session.refresh_token) return fail()
    await storeSession(session)
    await ensureProfile(session, nameFromMetadata(session.user?.user_metadata, session.user?.email))
    const response = attachSession(NextResponse.redirect(new URL(next, origin)), session)
    response.headers.set('Cache-Control', 'private, no-store')
    response.headers.set('Referrer-Policy', 'no-referrer')
    return response
  } catch {
    return fail()
  }
}
