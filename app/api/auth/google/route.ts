import { NextResponse } from "next/server"
import { GOOGLE_NEXT_COOKIE, GOOGLE_PKCE_COOKIE, PKCE_MAX_AGE_S, challengeFor, createVerifier } from "@/lib/oauth-pkce"
import { isGoogleSignInEnabled } from "@/lib/supabase-auth"
import { safeAuthDestination } from "@/lib/auth-recovery"
import { googleAuthorizeUrl, hasGoogleOAuthCredentials } from "@/lib/google-oauth"
import { googleRedirectUri, publicAuthOrigin } from "@/lib/auth-origin"

export const dynamic = "force-dynamic"

const STATE_COOKIE = "ng_auth_google_state"

/** Starts "Continue with Google": keeps a PKCE verifier in an httpOnly cookie and sends the person to Google. */
export async function GET(request: Request) {
  const origin = publicAuthOrigin(request)
  if (!isGoogleSignInEnabled() || !hasGoogleOAuthCredentials()) {
    return NextResponse.redirect(new URL("/auth?error=google-off", origin))
  }
  const verifier = createVerifier()
  const state = createVerifier()
  const redirectUri = googleRedirectUri(origin)
  const response = NextResponse.redirect(googleAuthorizeUrl({
    clientId: process.env.AUTH_GOOGLE_ID!.trim(),
    redirectUri,
    challenge: await challengeFor(verifier),
    state,
  }))
  const cookie = { httpOnly: true as const, secure: origin.startsWith("https:"), sameSite: "lax" as const, path: "/api/auth", maxAge: PKCE_MAX_AGE_S }
  response.cookies.set(GOOGLE_PKCE_COOKIE, verifier, cookie)
  response.cookies.set(STATE_COOKIE, state, cookie)
  response.cookies.set(GOOGLE_NEXT_COOKIE, safeAuthDestination(new URL(request.url).searchParams.get("next")), cookie)
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
