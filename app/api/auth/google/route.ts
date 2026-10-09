import { NextResponse } from "next/server"
import { PKCE_COOKIE, PKCE_MAX_AGE_S, authorizeUrl, challengeFor, createVerifier } from "@/lib/oauth-pkce"
import { isGoogleSignInEnabled, supabaseAuthUrl } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

/** Starts "Continue with Google": keeps a PKCE verifier in an httpOnly cookie and sends the person to Google via Supabase. */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  if (!isGoogleSignInEnabled()) return NextResponse.redirect(new URL("/auth?error=google-off", origin))
  const verifier = createVerifier()
  const response = NextResponse.redirect(authorizeUrl(supabaseAuthUrl(), "google", `${origin}/api/auth/callback`, await challengeFor(verifier)))
  response.cookies.set(PKCE_COOKIE, verifier, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth", maxAge: PKCE_MAX_AGE_S,
  })
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
