import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { GOOGLE_NEXT_COOKIE, GOOGLE_PKCE_COOKIE, nameFromMetadata } from "@/lib/oauth-pkce"
import { attachSession, ensureProfile, isAuthConfigured, sessionFromVerifiedGoogleProfile, signInWithGoogleIdToken, storeSession } from "@/lib/supabase-auth"
import { safeAuthDestination } from "@/lib/auth-recovery"
import { exchangeGoogleCode, profileFromIdToken } from "@/lib/google-oauth"
import { googleRedirectUri, publicAuthOrigin } from "@/lib/auth-origin"

export const dynamic = "force-dynamic"

const STATE_COOKIE = "ng_auth_google_state"

/** Google returns here with an authorization code. No query string is used in the registered redirect URI. */
export async function GET(request: Request) {
  const origin = publicAuthOrigin(request)
  const url = new URL(request.url)
  const fail = () => {
    const response = NextResponse.redirect(new URL("/auth?error=google", origin))
    response.headers.set("Cache-Control", "private, no-store")
    return response
  }
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const store = await cookies()
  const storeVerifier = store.get(GOOGLE_PKCE_COOKIE)?.value
  const storeState = store.get(STATE_COOKIE)?.value
  const storeNext = store.get(GOOGLE_NEXT_COOKIE)?.value
  store.delete({ name: GOOGLE_PKCE_COOKIE, path: "/api/auth" })
  store.delete({ name: STATE_COOKIE, path: "/api/auth" })
  store.delete({ name: GOOGLE_NEXT_COOKIE, path: "/api/auth" })
  const next = safeAuthDestination(storeNext)
  if (!isAuthConfigured() || !code || !storeVerifier || !state || !storeState || state !== storeState) return fail()

  const tokens = await exchangeGoogleCode({ code, redirectUri: googleRedirectUri(origin), codeVerifier: storeVerifier })
  if (!tokens.id_token) return fail()

  let attempt = await signInWithGoogleIdToken(tokens.id_token)
  if (!attempt.session?.access_token || !attempt.session.refresh_token) {
    attempt = await sessionFromVerifiedGoogleProfile(profileFromIdToken(tokens.id_token))
  }
  const session = attempt.session
  if (!session?.access_token || !session.refresh_token) return fail()

  const profile = profileFromIdToken(tokens.id_token)
  await storeSession(session)
  await ensureProfile(session, nameFromMetadata(session.user?.user_metadata ?? { full_name: profile.name }, session.user?.email ?? profile.email))
  const response = attachSession(NextResponse.redirect(new URL(next, origin)), session)
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}
