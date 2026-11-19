import { cookies } from "next/headers"
import type { NextResponse } from "next/server"
import { hasAppleOAuthCredentials, hasGoogleOAuthCredentials } from "@/lib/google-oauth"
import { sessionCookieOptions } from "@/lib/auth-origin"


export const ACCESS_COOKIE = "ng_access_token"
export const REFRESH_COOKIE = "ng_refresh_token"

export type SupabaseUser = { id: string; email?: string; identities?: unknown[]; user_metadata?: Record<string, unknown> }

type SupabaseSession = {
  access_token: string
  refresh_token: string
  expires_in?: number
  user?: SupabaseUser
}

export type AuthFailure = {
  code?: string
  message: string
  status: number
}

export type AuthAttempt = {
  session: SupabaseSession | null
  user: SupabaseUser | null
  error: AuthFailure | null
}

async function parseAuthAttempt(response: Response): Promise<AuthAttempt> {
  const body = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    return {
      session: null,
      user: null,
      error: {
        code: typeof body.error_code === "string" ? body.error_code : typeof body.code === "string" ? body.code : undefined,
        message: typeof body.msg === "string" ? body.msg : typeof body.message === "string" ? body.message : "Authentication failed",
        status: response.status,
      },
    }
  }
  const accessToken = typeof body.access_token === "string" ? body.access_token : undefined
  const refreshToken = typeof body.refresh_token === "string" ? body.refresh_token : undefined
  // GoTrue returns the user itself when signup requires email confirmation.
  const user = body.user && typeof body.user === "object" ? body.user as SupabaseUser
    : typeof body.id === "string" ? body as SupabaseUser : null
  const session = accessToken && refreshToken ? body as unknown as SupabaseSession : null
  return { session, user: session?.user ?? user, error: null }
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "")
  const key = process.env.SUPABASE_ANON_KEY
  if (!url || !key) throw new Error("Supabase authentication is not configured")
  return { url, key }
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const { url, key } = getSupabaseConfig()
  const headers = new Headers(init.headers)
  headers.set("apikey", key)
  headers.set("Content-Type", "application/json")
  return fetch(`${url}${path}`, { ...init, headers, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(12_000) })
}

export async function signIn(email: string, password: string): Promise<AuthAttempt> {
  const response = await supabaseRequest("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
  return parseAuthAttempt(response)
}

export async function signUp(email: string, password: string, displayName: string, redirectTo?: string, challenge?: string): Promise<AuthAttempt> {
  const path = redirectTo ? `/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}` : "/auth/v1/signup"
  const response = await supabaseRequest(path, {
    method: "POST",
    body: JSON.stringify({ email, password, data: { display_name: displayName }, ...(challenge ? { code_challenge: challenge, code_challenge_method: "s256" } : {}) }),
  })
  return parseAuthAttempt(response)
}

export async function resendSignup(email: string, redirectTo?: string, challenge?: string): Promise<AuthFailure | null> {
  const path = redirectTo ? `/auth/v1/resend?redirect_to=${encodeURIComponent(redirectTo)}` : "/auth/v1/resend"
  const response = await supabaseRequest(path, {
    method: "POST",
    body: JSON.stringify({ type: "signup", email, ...(challenge ? { code_challenge: challenge, code_challenge_method: "s256" } : {}) }),
  })
  if (response.ok) return null
  const attempt = await parseAuthAttempt(response)
  return attempt.error
}

export async function requestPasswordReset(email: string, redirectTo: string, challenge: string): Promise<AuthFailure | null> {
  const response = await supabaseRequest(`/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: "POST", body: JSON.stringify({ email, code_challenge: challenge, code_challenge_method: "s256" }),
  })
  return response.ok ? null : (await parseAuthAttempt(response)).error
}

export async function updatePassword(accessToken: string, password: string): Promise<AuthFailure | null> {
  const response = await supabaseRequest('/auth/v1/user', {
    method: 'PUT', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ password }),
  })
  return response.ok ? null : (await parseAuthAttempt(response)).error
}

/** Revoke the temporary recovery session after the password has changed. */
export async function revokeRecoverySession(accessToken: string) {
  await supabaseRequest('/auth/v1/logout?scope=global', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } })
}

/** Completes Google sign-in: trades the one-time code plus this browser's verifier for a session. */
export async function exchangeCode(authCode: string, codeVerifier: string) {
  const response = await supabaseRequest("/auth/v1/token?grant_type=pkce", { method: "POST", body: JSON.stringify({ auth_code: authCode, code_verifier: codeVerifier }) })
  if (!response.ok) return null
  return (await response.json()) as SupabaseSession
}

export async function refreshSession(refreshToken: string) {
  const result = await refreshSessionResult(refreshToken)
  return result.session
}

type RefreshResult = { session: SupabaseSession | null; invalid: boolean }

async function refreshSessionResult(refreshToken: string): Promise<RefreshResult> {
  try {
    const response = await supabaseRequest("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: refreshToken }) })
    if (response.ok) {
      const session = (await response.json()) as SupabaseSession
      if (session?.access_token && session.refresh_token) return { session, invalid: false }
      return { session: null, invalid: true }
    }
    if (response.status === 401 || response.status === 403) return { session: null, invalid: true }
    return { session: null, invalid: false }
  } catch {
    return { session: null, invalid: false }
  }
}

let refreshInFlight: Promise<RefreshResult> | null = null
let refreshInFlightToken: string | undefined

function refreshSessionSingleFlight(refreshToken: string): Promise<RefreshResult> {
  if (refreshInFlight && refreshInFlightToken === refreshToken) return refreshInFlight
  refreshInFlightToken = refreshToken
  refreshInFlight = refreshSessionResult(refreshToken).finally(() => {
    refreshInFlight = null
    refreshInFlightToken = undefined
  })
  return refreshInFlight
}

/** The signed-in user plus their access token, refreshing the session when needed. */
export async function getAuthContext(): Promise<{ user: { id: string; email?: string }; accessToken: string } | null> {
  const store = await cookies()
  const accessToken = store.get(ACCESS_COOKIE)?.value
  const refreshToken = store.get(REFRESH_COOKIE)?.value
  if (accessToken) {
    try {
      const response = await supabaseRequest("/auth/v1/user", { headers: { Authorization: `Bearer ${accessToken}` } })
      if (response.ok) return { user: (await response.json()) as { id: string; email?: string }, accessToken }
    } catch {
      // A network blip looking up the user must not wipe a still-valid refresh cookie.
    }
  }
  if (!refreshToken) {
    if (accessToken) await clearSession()
    return null
  }
  const result = await refreshSessionSingleFlight(refreshToken)
  if (result.session?.access_token && result.session.refresh_token) {
    await storeSession(result.session)
    return result.session.user
      ? { user: { id: result.session.user.id, email: result.session.user.email }, accessToken: result.session.access_token }
      : { user: { id: "", email: undefined }, accessToken: result.session.access_token }
  }
  if (result.invalid) await clearSession()
  return null
}

/** Completes Google sign-in by trading a Google ID token for a Supabase session. */
export async function signInWithGoogleIdToken(idToken: string): Promise<AuthAttempt> {
  const response = await supabaseRequest("/auth/v1/token?grant_type=id_token", {
    method: "POST",
    body: JSON.stringify({ provider: "google", id_token: idToken }),
  })
  return parseAuthAttempt(response)
}

/** Last-resort path when the Google provider is not yet enabled in Supabase: create or confirm the user with the service role and issue a session. */
export async function sessionFromVerifiedGoogleProfile(profile: { email?: string; name?: string }): Promise<AuthAttempt> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const email = profile.email?.trim()
  if (!key || !email) return { session: null, user: null, error: { message: "Google account is not available", status: 503 } }
  const { url } = getSupabaseConfig()
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
  const metadata = { full_name: profile.name, name: profile.name, display_name: profile.name }
  try {
    await fetch(`${url}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({ email, email_confirm: true, user_metadata: metadata }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    })
    const linkResponse = await fetch(`${url}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "magiclink", email, data: metadata }),
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    })
    const linkBody = await linkResponse.json().catch(() => ({})) as Record<string, unknown>
    const properties = linkBody.properties && typeof linkBody.properties === "object" ? linkBody.properties as Record<string, unknown> : linkBody
    const token = typeof properties.email_otp === "string" ? properties.email_otp
      : typeof properties.hashed_token === "string" ? properties.hashed_token
      : undefined
    if (!token) return { session: null, user: null, error: { message: "Google account is not available", status: 503 } }
    const verify = await supabaseRequest("/auth/v1/verify", {
      method: "POST",
      body: JSON.stringify({ type: "magiclink", email, token }),
    })
    return parseAuthAttempt(verify)
  } catch {
    return { session: null, user: null, error: { message: "Authentication service is unavailable", status: 503 } }
  }
}

export async function getSession() {
  return (await getAuthContext())?.user ?? null
}

export const isAuthConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
export const isHeroServerConfigured = () => isAuthConfigured() && Boolean(process.env.HERO_DB_API_KEY)

/** Google sign-in is shown only when AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET are set. */
export const isGoogleSignInEnabled = () => isAuthConfigured() && hasGoogleOAuthCredentials()

/** Apple sign-in stays hidden unless explicitly enabled and both credentials are set. */
export const isAppleSignInEnabled = () => isAuthConfigured() && hasAppleOAuthCredentials()

export const supabaseAuthUrl = () => getSupabaseConfig().url

/** PostgREST call as the signed-in user, so row-level security applies. */
export function userRest(accessToken: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${accessToken}`)
  return supabaseRequest(`/rest/v1/${path}`, { ...init, headers })
}

/** Hero-only PostgREST call authenticated by a server secret checked inside RLS. */
export function heroServerRest(path: string, init: RequestInit = {}) {
  const serverKey = process.env.HERO_DB_API_KEY
  if (!serverKey) throw new Error("Hero database access is not configured")
  const { url, key } = getSupabaseConfig()
  const headers = new Headers(init.headers)
  headers.set("apikey", key)
  headers.set("x-narcoguard-server-key", serverKey)
  headers.set("Content-Type", "application/json")
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" })
}

/** PostgREST call with the service role (bypasses RLS). Server-only writes the client must not make itself. */
export function serviceRest(path: string, init: RequestInit = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("Supabase service access is not configured")
  const { url } = getSupabaseConfig()
  const headers = new Headers(init.headers)
  headers.set("apikey", key)
  headers.set("Authorization", `Bearer ${key}`)
  headers.set("Content-Type", "application/json")
  return fetch(`${url}/rest/v1/${path}`, { ...init, headers, cache: "no-store" })
}

const REFRESH_MAX_AGE = 60 * 60 * 24 * 30

type CookieJar = { set: (name: string, value: string, options: ReturnType<typeof sessionCookieOptions>) => void }

export function writeSessionCookies(jar: CookieJar, session: SupabaseSession) {
  jar.set(ACCESS_COOKIE, session.access_token, sessionCookieOptions(Math.max(60, session.expires_in ?? 3600)))
  jar.set(REFRESH_COOKIE, session.refresh_token, sessionCookieOptions(REFRESH_MAX_AGE))
}

export function writeClearedSessionCookies(jar: CookieJar) {
  jar.set(ACCESS_COOKIE, "", sessionCookieOptions(0))
  jar.set(REFRESH_COOKIE, "", sessionCookieOptions(0))
}

/** Attach the session to a Route Handler response so redirects cannot drop Set-Cookie. */
export function attachSession(response: NextResponse, session: SupabaseSession) {
  writeSessionCookies(response.cookies, session)
  return response
}

export async function storeSession(session: SupabaseSession) {
  const store = await cookies()
  writeSessionCookies(store, session)
}

export async function clearSession() {
  const store = await cookies()
  writeClearedSessionCookies(store)
}

export async function ensureProfile(session: SupabaseSession, displayName: string) {
  if (!session.user?.id || !session.user.email) return
  const { url, key } = getSupabaseConfig()
  // This optional profile must not invalidate an already authenticated session.
  try {
    await fetch(`${url}/rest/v1/users`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ auth_user_id: session.user.id, display_name: displayName, email: session.user.email, role: "user" }), cache: "no-store", signal: AbortSignal.timeout(5000) })
  } catch {
    // Authentication remains valid; profile-backed features can report their own availability.
  }
}
