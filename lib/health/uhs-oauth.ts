import { challengeFor, createVerifier } from "@/lib/oauth-pkce"
import { getUhsSmartConfig } from "@/lib/health/uhs-mychart"

export const UHS_PKCE_COOKIE = "ng_uhs_pkce_verifier"
export const UHS_STATE_COOKIE = "ng_uhs_oauth_state"
export const UHS_SESSION_COOKIE = "ng_uhs_fhir_session"
export const UHS_OAUTH_MAX_AGE_S = 600
export const UHS_SESSION_MAX_AGE_S = 55 * 60

const encoder = new TextEncoder()

function b64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url")
}

function fromB64url(value: string) {
  return new Uint8Array(Buffer.from(value, "base64url"))
}

async function sessionKey(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret))
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"])
}

export type UhsSession = {
  accessToken: string
  patient?: string
  expiresAt: number
}

export async function sealUhsSession(session: UhsSession, secret: string) {
  if (secret.length < 32) throw new Error("UHS session secret must be at least 32 characters")
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await sessionKey(secret),
    encoder.encode(JSON.stringify(session)),
  )
  return `${b64url(iv)}.${b64url(new Uint8Array(ciphertext))}`
}

export async function openUhsSession(value: string, secret: string): Promise<UhsSession | null> {
  try {
    if (secret.length < 32) return null
    const [ivValue, cipherValue] = value.split(".")
    if (!ivValue || !cipherValue) return null
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64url(ivValue) },
      await sessionKey(secret),
      fromB64url(cipherValue),
    )
    const parsed = JSON.parse(new TextDecoder().decode(plaintext)) as UhsSession
    if (!parsed.accessToken || !Number.isFinite(parsed.expiresAt) || parsed.expiresAt <= Date.now()) return null
    return parsed
  } catch {
    return null
  }
}

export async function buildUhsAuthorizeUrl(redirectUri: string, state: string, verifier: string, env: NodeJS.ProcessEnv = process.env) {
  const config = getUhsSmartConfig(env)
  if (!config.configured || !config.authUrl || !config.clientId || !config.fhirBaseUrl) return null
  const challenge = await challengeFor(verifier)
  const url = new URL(config.authUrl)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", config.scopes.join(" "))
  url.searchParams.set("aud", config.fhirBaseUrl)
  url.searchParams.set("state", state)
  url.searchParams.set("code_challenge", challenge)
  url.searchParams.set("code_challenge_method", "S256")
  return url.toString()
}

export const createUhsVerifier = () => createVerifier()
export const createUhsState = () => createVerifier()
