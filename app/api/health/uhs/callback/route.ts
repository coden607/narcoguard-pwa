import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { SITE_URL } from "@/lib/site-url"
import { getUhsSmartConfig } from "@/lib/health/uhs-mychart"
import {
  sealUhsSession,
  UHS_OAUTH_MAX_AGE_S,
  UHS_PKCE_COOKIE,
  UHS_SESSION_COOKIE,
  UHS_SESSION_MAX_AGE_S,
  UHS_STATE_COOKIE,
} from "@/lib/health/uhs-oauth"

const fail = (reason: string) => NextResponse.redirect(`${SITE_URL}/health-records?error=${encodeURIComponent(reason)}`)

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const store = await cookies()
  const verifier = store.get(UHS_PKCE_COOKIE)?.value
  const expectedState = store.get(UHS_STATE_COOKIE)?.value
  store.delete(UHS_PKCE_COOKIE)
  store.delete(UHS_STATE_COOKIE)

  if (!code || !state || !verifier || !expectedState || state !== expectedState) return fail("invalid-callback")

  const config = getUhsSmartConfig()
  const secret = process.env.UHS_SMART_SESSION_SECRET
  if (!config.configured || !config.tokenUrl || !config.clientId || !secret) return fail("not-configured")

  const redirectUri = `${SITE_URL}/api/health/uhs/callback`
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: config.clientId,
      code_verifier: verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  }).catch(() => null)

  if (!response?.ok) return fail("token-exchange")

  const body = await response.json().catch(() => null) as { access_token?: unknown; expires_in?: unknown; patient?: unknown } | null
  if (!body || typeof body.access_token !== "string") return fail("token-response")
  const expiresIn = typeof body.expires_in === "number" && body.expires_in > 0 ? Math.min(body.expires_in, UHS_SESSION_MAX_AGE_S) : UHS_SESSION_MAX_AGE_S
  const sealed = await sealUhsSession({
    accessToken: body.access_token,
    patient: typeof body.patient === "string" ? body.patient : undefined,
    expiresAt: Date.now() + expiresIn * 1000,
  }, secret)

  const secure = process.env.NODE_ENV === "production"
  store.set(UHS_SESSION_COOKIE, sealed, { httpOnly: true, secure, sameSite: "lax", path: "/api/health/uhs", maxAge: expiresIn })
  return NextResponse.redirect(`${SITE_URL}/health-records?connected=1`)
}
