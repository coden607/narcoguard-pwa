// Direct Sign in with Apple (authorization code, form_post). The app exchanges
// the code with a client-secret JWT signed with the Apple .p8 key, then creates
// a Supabase session from the Apple ID token — mirroring the Google flow in
// lib/google-oauth.ts. Apple does not support PKCE for web sign-in, so the
// state cookie is the CSRF protection for this flow.
//
// Credentials (all server-only, set in Vercel; never commit real values):
//   AUTH_APPLE_ENABLED=true
//   AUTH_APPLE_ID       Services ID, e.g. app.narcoguard.web
//   AUTH_APPLE_SECRET   the .p8 private key contents (PEM, \n escapes allowed)
//   AUTH_APPLE_TEAM_ID  Apple Developer Team ID
//   AUTH_APPLE_KEY_ID   Key ID of the .p8 key
// These four values are exactly the ones Supabase Auth also needs for its
// Apple provider, so enabling the provider there uses the same values.

import { createPrivateKey, sign } from "node:crypto"

export function hasAppleClientSecret(): boolean {
  return Boolean(
    process.env.AUTH_APPLE_ID?.trim() &&
      process.env.AUTH_APPLE_SECRET?.trim() &&
      process.env.AUTH_APPLE_TEAM_ID?.trim() &&
      process.env.AUTH_APPLE_KEY_ID?.trim(),
  )
}

export function appleAuthorizeUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
}): string {
  const url = new URL("https://appleid.apple.com/auth/authorize")
  url.searchParams.set("client_id", opts.clientId)
  url.searchParams.set("redirect_uri", opts.redirectUri)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("response_mode", "form_post")
  url.searchParams.set("scope", "name email")
  url.searchParams.set("state", opts.state)
  return url.toString()
}

const base64url = (bytes: Uint8Array | Buffer): string =>
  Buffer.from(bytes).toString("base64url")

/** Convert a DER-encoded ECDSA signature to the raw R||S form a JWT needs. */
function derToJose(der: Buffer): Buffer {
  if (der[0] !== 0x30) throw new Error("bad-signature")
  let offset = 2
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f)
  const readInt = (): Buffer => {
    if (der[offset++] !== 0x02) throw new Error("bad-signature")
    let length = der[offset++]
    if (length & 0x80) {
      const bytes = length & 0x7f
      length = 0
      for (let i = 0; i < bytes; i++) length = (length << 8) | der[offset++]
    }
    let value = der.subarray(offset, offset + length)
    offset += length
    if (value[0] === 0x00) value = value.subarray(1)
    const out = Buffer.alloc(32)
    value.copy(out, 32 - value.length)
    return out
  }
  return Buffer.concat([readInt(), readInt()])
}

/**
 * Signs the short-lived client-secret JWT Apple requires. The key is the .p8
 * contents from AUTH_APPLE_SECRET; Vercel stores multi-line secrets with
 * literal \n escapes, which are restored here.
 */
export function appleClientSecret(): string | null {
  const clientId = process.env.AUTH_APPLE_ID?.trim()
  const teamId = process.env.AUTH_APPLE_TEAM_ID?.trim()
  const keyId = process.env.AUTH_APPLE_KEY_ID?.trim()
  const pem = process.env.AUTH_APPLE_SECRET?.trim().replace(/\\n/g, "\n")
  if (!clientId || !teamId || !keyId || !pem) return null
  try {
    const now = Math.floor(Date.now() / 1000)
    const header = base64url(Buffer.from(JSON.stringify({ alg: "ES256", kid: keyId, typ: "JWT" })))
    const payload = base64url(
      Buffer.from(
        JSON.stringify({
          iss: teamId,
          iat: now,
          exp: now + 600,
          aud: "https://appleid.apple.com",
          sub: clientId,
        }),
      ),
    )
    const signingInput = `${header}.${payload}`
    const key = createPrivateKey(pem)
    const signature = sign(null, Buffer.from(signingInput), key)
    return `${signingInput}.${base64url(derToJose(signature))}`
  } catch {
    return null
  }
}

export type AppleTokenSet = {
  id_token?: string
  access_token?: string
  error?: string
}

export async function exchangeAppleCode(opts: {
  code: string
  redirectUri: string
}): Promise<AppleTokenSet> {
  const clientId = process.env.AUTH_APPLE_ID?.trim()
  const clientSecret = appleClientSecret()
  if (!clientId || !clientSecret) return { error: "missing-credentials" }
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: opts.code,
    grant_type: "authorization_code",
    redirect_uri: opts.redirectUri,
  })
  try {
    const response = await fetch("https://appleid.apple.com/auth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    })
    const json = (await response.json().catch(() => ({}))) as Record<string, unknown>
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

/** Read email from a JWT payload without verifying the signature. The token must already have come from Apple's token endpoint. */
export function profileFromAppleIdToken(idToken: string): { email?: string } {
  const part = idToken.split(".")[1]
  if (!part) return {}
  try {
    const json = JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as Record<string, unknown>
    return { email: typeof json.email === "string" ? json.email : undefined }
  } catch {
    return {}
  }
}

/**
 * Apple sends the person's name only on the first authorization, as a JSON
 * string in the `user` form field. Parse it defensively; anything else is ignored.
 */
export function nameFromAppleUserField(raw: string | null): string | undefined {
  if (!raw) return undefined
  try {
    const parsed = JSON.parse(raw) as { name?: { firstName?: unknown; lastName?: unknown } }
    const first = typeof parsed.name?.firstName === "string" ? parsed.name.firstName.trim() : ""
    const last = typeof parsed.name?.lastName === "string" ? parsed.name.lastName.trim() : ""
    const full = `${first} ${last}`.trim()
    return full || undefined
  } catch {
    return undefined
  }
}
