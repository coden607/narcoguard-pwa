import { generateKeyPairSync } from "node:crypto"
import { strict as assert } from "node:assert"
import { test } from "node:test"
import { createVapidJwt, isAllowedPushEndpoint, vapidConfigured } from "../lib/hero-push"

test("push endpoint allowlist blocks arbitrary SSRF destinations", () => {
  assert.equal(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc"), true)
  assert.equal(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc"), true)
  assert.equal(isAllowedPushEndpoint("https://web.push.apple.com/abc"), true)
  assert.equal(isAllowedPushEndpoint("https://example.com/internal"), false)
  assert.equal(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc"), false)
})

test("VAPID JWT is ES256 shaped for an allowed endpoint", () => {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" })
  const jwk = privateKey.export({ format: "jwk" })
  const token = createVapidJwt(
    "https://fcm.googleapis.com/fcm/send/test",
    JSON.stringify(jwk),
    "mailto:hero@narcoguard.app",
    1_800_000_000_000,
  )
  const parts = token.split(".")
  assert.equal(parts.length, 3)
  const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { aud: string; sub: string }
  assert.equal(payload.aud, "https://fcm.googleapis.com")
  assert.equal(payload.sub, "mailto:hero@narcoguard.app")
})

test("push configuration requires private key, public key, and subject", () => {
  assert.equal(vapidConfigured({}), false)
  assert.equal(vapidConfigured({ HERO_VAPID_PRIVATE_JWK: "{}", HERO_VAPID_PUBLIC_KEY: "p", HERO_VAPID_SUBJECT: "mailto:a@b.c" }), true)
})
