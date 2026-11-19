// Direct Google OAuth (authorization code + PKCE). The app exchanges the code
// with AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET, then creates a Supabase session.

export function hasGoogleOAuthCredentials(): boolean {
  return Boolean(process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim())
}

export function hasAppleOAuthCredentials(): boolean {
  return process.env.AUTH_APPLE_ENABLED === "true" && Boolean(process.env.AUTH_APPLE_ID?.trim() && process.env.AUTH_APPLE_SECRET?.trim())
}

export function googleAuthorizeUrl(opts: {
  clientId: string
  redirectUri: string
  challenge: string
  state: string
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", opts.clientId)
  url.searchParams.set("redirect_uri", opts.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "openid email profile")
  url.searchParams.set("code_challenge", opts.challenge)
  url.searchParams.set("code_challenge_method", "S256")
  url.searchParams.set("state", opts.state)
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "select_account")
  return url.toString()
}

export type GoogleTokenSet = {
  id_token?: string
  access_token?: string
  error?: string
}

export async function exchangeGoogleCode(opts: {
  code: string
  redirectUri: string
  codeVerifier: string
}): Promise<GoogleTokenSet> {
  const clientId = process.env.AUTH_GOOGLE_ID?.trim()
  const clientSecret = process.env.AUTH_GOOGLE_SECRET?.trim()
  if (!clientId || !clientSecret) return { error: "missing-credentials" }
  const body = new URLSearchParams({
    code: opts.code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: opts.redirectUri,
    grant_type: "authorization_code",
    code_verifier: opts.codeVerifier,
  })
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    })
    const json = await response.json().catch(() => ({})) as Record<string, unknown>
    if (!response.ok || typeof json.id_token !== "string") {
      return { error: typeof json.error === "string" ? json.error : "token-exchange-failed" }
    }
    return {
      id_token: json.id_token,
      access_token: typeof json.access_token === "string" ? json.access_token : undefined,
    }
  } catch {
    return { error: "token-exchange-failed" }
  }
}

/** Read email and name from a JWT payload without verifying the signature. The token must already have come from Google's token endpoint. */
export function profileFromIdToken(idToken: string): { email?: string; name?: string } {
  const part = idToken.split(".")[1]
  if (!part) return {}
  try {
    const json = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as Record<string, unknown>
    return {
      email: typeof json.email === "string" ? json.email : undefined,
      name: typeof json.name === "string" ? json.name : typeof json.given_name === "string" ? json.given_name : undefined,
    }
  } catch {
    return {}
  }
}
