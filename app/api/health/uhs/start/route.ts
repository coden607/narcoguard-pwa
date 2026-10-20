import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSession } from "@/lib/supabase-auth"
import { SITE_URL } from "@/lib/site-url"
import {
  buildUhsAuthorizeUrl,
  createUhsState,
  createUhsVerifier,
  UHS_OAUTH_MAX_AGE_S,
  UHS_PKCE_COOKIE,
  UHS_STATE_COOKIE,
} from "@/lib/health/uhs-oauth"

export async function GET() {
  const user = await getSession()
  if (!user) return NextResponse.redirect(`${SITE_URL}/auth?next=%2Fhealth-records`)

  const verifier = createUhsVerifier()
  const state = createUhsState()
  const redirectUri = `${SITE_URL}/api/health/uhs/callback`
  const authorize = await buildUhsAuthorizeUrl(redirectUri, state, verifier)
  if (!authorize) return NextResponse.redirect(`${SITE_URL}/health-records?error=not-configured`)

  const secure = process.env.NODE_ENV === "production"
  const store = await cookies()
  const options = { httpOnly: true, secure, sameSite: "lax" as const, path: "/api/health/uhs", maxAge: UHS_OAUTH_MAX_AGE_S }
  store.set(UHS_PKCE_COOKIE, verifier, options)
  store.set(UHS_STATE_COOKIE, state, options)
  return NextResponse.redirect(authorize)
}
