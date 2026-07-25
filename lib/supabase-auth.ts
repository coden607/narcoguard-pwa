import { cookies } from "next/headers"

const ACCESS_COOKIE = "ng_access_token"
const REFRESH_COOKIE = "ng_refresh_token"

type SupabaseSession = {
  access_token: string
  refresh_token: string
  expires_in?: number
  user?: { id: string; email?: string }
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
  return fetch(`${url}${path}`, { ...init, headers, cache: "no-store" })
}

export async function signIn(email: string, password: string) {
  const response = await supabaseRequest("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) })
  if (!response.ok) return null
  return (await response.json()) as SupabaseSession
}

export async function signUp(email: string, password: string, displayName: string) {
  const response = await supabaseRequest("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: { display_name: displayName } }) })
  if (!response.ok) return null
  return (await response.json()) as SupabaseSession
}

export async function getSession() {
  const accessToken = (await cookies()).get(ACCESS_COOKIE)?.value
  if (!accessToken) return null
  const response = await supabaseRequest("/auth/v1/user", { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!response.ok) return null
  return (await response.json()) as { id: string; email?: string }
}

export async function storeSession(session: SupabaseSession) {
  const store = await cookies()
  const secure = process.env.NODE_ENV === "production"
  store.set(ACCESS_COOKIE, session.access_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(60, session.expires_in ?? 3600) })
  store.set(REFRESH_COOKIE, session.refresh_token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 })
}

export async function clearSession() {
  const store = await cookies()
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}

export async function ensureProfile(session: SupabaseSession, displayName: string) {
  if (!session.user?.id || !session.user.email) return
  const { url, key } = getSupabaseConfig()
  await fetch(`${url}/rest/v1/users`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ auth_user_id: session.user.id, display_name: displayName, email: session.user.email, role: "user" }), cache: "no-store" })
}
