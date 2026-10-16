import { createPrivateKey, sign } from "node:crypto"

const b64url = (value: Buffer | string) =>
  (Buffer.isBuffer(value) ? value : Buffer.from(value)).toString("base64url")

export const PUSH_ENDPOINT_HOSTS = [
  "fcm.googleapis.com",
  "updates.push.services.mozilla.com",
  "push.services.mozilla.com",
  "web.push.apple.com",
] as const

export function isAllowedPushEndpoint(value: unknown) {
  if (typeof value !== "string" || value.length > 2048) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" && (PUSH_ENDPOINT_HOSTS as readonly string[]).includes(url.hostname)
  } catch {
    return false
  }
}

export function vapidConfigured(env: Record<string, string | undefined>) {
  return Boolean(env.HERO_VAPID_PRIVATE_JWK && env.HERO_VAPID_PUBLIC_KEY && env.HERO_VAPID_SUBJECT)
}

export function createVapidJwt(endpoint: string, privateJwkJson: string, subject: string, now = Date.now()) {
  if (!isAllowedPushEndpoint(endpoint)) throw new Error("Push endpoint is not allowed")
  const audience = new URL(endpoint).origin
  const header = b64url(JSON.stringify({ typ: "JWT", alg: "ES256" }))
  const payload = b64url(JSON.stringify({
    aud: audience,
    exp: Math.floor(now / 1000) + 12 * 60 * 60,
    sub: subject,
  }))
  const input = `${header}.${payload}`
  const jwk = JSON.parse(privateJwkJson) as Record<string, string>
  const key = createPrivateKey({ key: jwk, format: "jwk" })
  const signature = sign("sha256", Buffer.from(input), { key, dsaEncoding: "ieee-p1363" })
  return `${input}.${signature.toString("base64url")}`
}

export async function sendEmptyWebPush(
  endpoint: string,
  env: Record<string, string | undefined>,
) {
  if (!vapidConfigured(env) || !isAllowedPushEndpoint(endpoint)) return { ok: false, status: 0 }
  const jwt = createVapidJwt(endpoint, env.HERO_VAPID_PRIVATE_JWK!, env.HERO_VAPID_SUBJECT!)
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "120",
      Urgency: "high",
      Authorization: `vapid t=${jwt}, k=${env.HERO_VAPID_PUBLIC_KEY}`,
    },
    cache: "no-store",
  })
  return { ok: response.ok, status: response.status }
}
