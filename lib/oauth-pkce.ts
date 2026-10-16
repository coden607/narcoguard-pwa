// One-tap sign-in with Google through Supabase Auth, using the PKCE flow so the code returned
// to NarcoGuard is useless to anyone without the verifier kept in this browser's httpOnly cookie.

export const PKCE_COOKIE = "ng_pkce_verifier"
export const PKCE_MAX_AGE_S = 600

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

/** A random 43-character verifier (RFC 7636 allows 43–128 unreserved characters). */
export function createVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)))
}

export async function challengeFor(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))))
}

export function authorizeUrl(supabaseUrl: string, provider: "google", redirectTo: string, challenge: string): string {
  const url = new URL(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize`)
  url.searchParams.set("provider", provider)
  url.searchParams.set("redirect_to", redirectTo)
  url.searchParams.set("code_challenge", challenge)
  url.searchParams.set("code_challenge_method", "s256")
  return url.toString()
}

/** The name Google shares with Supabase, so nothing has to be typed. */
export function nameFromMetadata(metadata: Record<string, unknown> | undefined, email: string | undefined): string {
  for (const key of ["full_name", "name", "display_name"]) {
    const value = metadata?.[key]
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 80)
  }
  return email?.split("@")[0]?.slice(0, 80) || "NarcoGuard user"
}
