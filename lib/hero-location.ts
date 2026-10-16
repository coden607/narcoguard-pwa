import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

const keyFor = (secret: string) => createHash("sha256").update("narcoguard:hero-location:v1:").update(secret).digest()

export function sealHeroLocation(input: { lat: number; lon: number }, secret: string) {
  if (!secret || !Number.isFinite(input.lat) || !Number.isFinite(input.lon) || Math.abs(input.lat) > 90 || Math.abs(input.lon) > 180) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret), iv)
  const plaintext = Buffer.from(JSON.stringify({ lat: input.lat, lon: input.lon }), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".")
}

export function openHeroLocation(value: string | null | undefined, secret: string) {
  if (!value || !secret) return null
  try {
    const [ivText, tagText, encryptedText] = value.split(".")
    if (!ivText || !tagText || !encryptedText) return null
    const decipher = createDecipheriv("aes-256-gcm", keyFor(secret), Buffer.from(ivText, "base64url"))
    decipher.setAuthTag(Buffer.from(tagText, "base64url"))
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]).toString("utf8")
    const parsed = JSON.parse(plaintext) as { lat?: unknown; lon?: unknown }
    if (typeof parsed.lat !== "number" || typeof parsed.lon !== "number") return null
    if (!Number.isFinite(parsed.lat) || !Number.isFinite(parsed.lon) || Math.abs(parsed.lat) > 90 || Math.abs(parsed.lon) > 180) return null
    return { lat: parsed.lat, lon: parsed.lon }
  } catch {
    return null
  }
}

export function cleanMeetingNote(value: unknown) {
  if (typeof value !== "string") return null
  const cleaned = value.replace(/\s+/g, " ").trim().slice(0, 240)
  return cleaned || null
}
