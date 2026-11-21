import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { nameFromMetadata } from "@/lib/oauth-pkce"
import { attachSession, ensureProfile, isAuthConfigured, sessionFromVerifiedAppleProfile, signInWithAppleIdToken, storeSession } from "@/lib/supabase-auth"
import { safeAuthDestination } from "@/lib/auth-recovery"
import { exchangeAppleCode, nameFromAppleUserField, profileFromAppleIdToken } from "@/lib/apple-oauth"
import { appleRedirectUri, publicAuthOrigin } from "@/lib/auth-origin"
import { APPLE_NEXT_COOKIE, APPLE_STATE_COOKIE } from "@/lib/oauth-pkce"

export const dynamic = "force-dynamic"

/**
 * Apple returns here with an authorization code via POST (response_mode=form_post).
 * No query string is used in the registered redirect URI.
 */
export async function POST(request: Request) {
  const origin = publicAuthOrigin(request)
  const fail = () => {
    const response = NextResponse.redirect(new URL("/auth?error=apple", origin))
    response.headers.set("Cache-Control", "private, no-store")
    return response
  }
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail()
  }
  // Apple posts errors the same way (error + error_description); treat them as a failed sign-in.
  const code = typeof form.get("code") === "string" ? (form.get("code") as string) : null
  const state = typeof form.get("state") === "string" ? (form.get("state") as string) : null
  const userField = typeof form.get("user") === "string" ? (form.get("user") as string) : null
  const store = await cookies()
  const storeState = store.get(APPLE_STATE_COOKIE)?.value
  const storeNext = store.get(APPLE_NEXT_COOKIE)?.value
  store.delete({ name: APPLE_STATE_COOKIE, path: "/api/auth" })
  store.delete({ name: APPLE_NEXT_COOKIE, path: "/api/auth" })
  const next = safeAuthDestination(storeNext)
  if (!isAuthConfigured() || !code || !state || !storeState || state !== storeState) return fail()

  const tokens = await exchangeAppleCode({ code, redirectUri: appleRedirectUri(origin) })
  if (!tokens.id_token) return fail()

  let attempt = await signInWithAppleIdToken(tokens.id_token)
  if (!attempt.session?.access_token || !attempt.session.refresh_token) {
    const profile = profileFromAppleIdToken(tokens.id_token)
    attempt = await sessionFromVerifiedAppleProfile({
      email: profile.email,
      name: nameFromAppleUserField(userField) ?? profile.email?.split("@")[0],
    })
  }
  const session = attempt.session
  if (!session?.access_token || !session.refresh_token) return fail()

  const profile = profileFromAppleIdToken(tokens.id_token)
  await storeSession(session)
  await ensureProfile(session, nameFromMetadata(session.user?.user_metadata ?? { full_name: nameFromAppleUserField(userField) }, session.user?.email ?? profile.email))
  const response = attachSession(NextResponse.redirect(new URL(next, origin)), session)
  response.headers.set("Cache-Control", "private, no-store")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}

/** Apple never GETs this callback on success; a stray visit goes back to sign-in. */
export async function GET(request: Request) {
  const origin = publicAuthOrigin(request)
  const response = NextResponse.redirect(new URL("/auth?error=apple", origin))
  response.headers.set("Cache-Control", "private, no-store")
  return response
}
