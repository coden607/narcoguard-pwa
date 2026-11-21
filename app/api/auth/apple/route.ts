import { NextResponse } from "next/server"
import { PKCE_MAX_AGE_S, APPLE_NEXT_COOKIE, APPLE_STATE_COOKIE, createVerifier } from "@/lib/oauth-pkce"
import { isAppleSignInEnabled } from "@/lib/supabase-auth"
import { safeAuthDestination } from "@/lib/auth-recovery"
import { appleAuthorizeUrl, hasAppleClientSecret } from "@/lib/apple-oauth"
import { appleRedirectUri, publicAuthOrigin } from "@/lib/auth-origin"

export const dynamic = "force-dynamic"

/** Starts "Continue with Apple": keeps a state token in an httpOnly cookie and sends the person to Apple. */
export async function GET(request: Request) {
  const origin = publicAuthOrigin(request)
  if (!isAppleSignInEnabled() || !hasAppleClientSecret()) {
    return NextResponse.redirect(new URL("/auth?error=apple-off", origin))
  }
  const state = createVerifier()
  const redirectUri = appleRedirectUri(origin)
  const response = NextResponse.redirect(appleAuthorizeUrl({
    clientId: process.env.AUTH_APPLE_ID!.trim(),
    redirectUri,
    state,
  }))
  const cookie = { httpOnly: true as const, secure: origin.startsWith("https:"), sameSite: "lax" as const, path: "/api/auth", maxAge: PKCE_MAX_AGE_S }
  response.cookies.set(APPLE_STATE_COOKIE, state, cookie)
  response.cookies.set(APPLE_NEXT_COOKIE, safeAuthDestination(new URL(request.url).searchParams.get("next")), cookie)
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
