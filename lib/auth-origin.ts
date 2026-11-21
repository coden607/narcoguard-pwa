/** Canonical public origin for OAuth redirects and session cookies. */
export const AUTH_CALLBACK_GOOGLE_PATH = "/api/auth/callback/google"
export const AUTH_CALLBACK_APPLE_PATH = "/api/auth/callback/apple"
export const AUTH_CALLBACK_EMAIL_PATH = "/api/auth/callback"
export const AUTH_RECOVERY_PATH = "/api/auth/recovery"
export const PRODUCTION_ORIGIN = "https://www.narcoguard.app"
const PRODUCTION_HOSTS = new Set(["www.narcoguard.app", "narcoguard.app"])

export function configuredAuthOrigin(): string {
  const raw = process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL
  return raw ? raw.replace(/\/+$/, "") : ""
}

/** Production always uses www so cookies and OAuth redirects stay on one host. Preview and local keep the request origin. */
export function publicAuthOrigin(request: Request): string {
  try {
    const url = new URL(request.url)
    if (PRODUCTION_HOSTS.has(url.hostname)) return PRODUCTION_ORIGIN
    return url.origin
  } catch {
    return configuredAuthOrigin() || (process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : "http://localhost:3000")
  }
}

export function googleRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${AUTH_CALLBACK_GOOGLE_PATH}`
}

export function appleRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${AUTH_CALLBACK_APPLE_PATH}`
}

export function emailRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${AUTH_CALLBACK_EMAIL_PATH}`
}

export function recoveryRedirectUri(origin: string): string {
  return `${origin.replace(/\/+$/, "")}${AUTH_RECOVERY_PATH}`
}

export function sessionCookieOptions(maxAge: number) {
  const origin = configuredAuthOrigin() || (process.env.NODE_ENV === "production" ? PRODUCTION_ORIGIN : "")
  let hostname = ""
  try { hostname = origin ? new URL(origin).hostname : "" } catch { hostname = "" }
  const secure = (origin ? origin.startsWith("https:") : false) || process.env.NODE_ENV === "production"
  const options: { httpOnly: true; secure: boolean; sameSite: "lax"; path: "/"; maxAge: number; domain?: string } = {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge,
  }
  if (hostname === "www.narcoguard.app" || hostname === "narcoguard.app") options.domain = ".narcoguard.app"
  return options
}
