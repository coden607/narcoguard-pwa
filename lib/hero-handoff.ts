import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

export const HERO_CONTACT_METHODS = ["phone", "text", "email", "community-handle"] as const
export type HeroContactMethod = (typeof HERO_CONTACT_METHODS)[number]

export interface HeroContactHandoff {
  method: HeroContactMethod
  value: string
}

const keyFor = (secret: string) =>
  createHash("sha256").update("narcoguard:hero-contact:v1:").update(secret).digest()

export function cleanHeroContact(input: {
  method: unknown
  value: unknown
}): HeroContactHandoff | null {
  if (
    typeof input.method !== "string" ||
    !(HERO_CONTACT_METHODS as readonly string[]).includes(input.method) ||
    typeof input.value !== "string"
  ) return null

  const value = input.value.replace(/\s+/g, " ").trim().slice(0, 160)
  if (!value) return null

  if ((input.method === "phone" || input.method === "text") && !/^[+()\-\.\s0-9]{7,30}$/.test(value)) return null
  if (input.method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null
  if (input.method === "community-handle" && !/^[a-zA-Z0-9_]{3,24}$/.test(value)) return null

  return { method: input.method as HeroContactMethod, value }
}

export function sealHeroContact(input: HeroContactHandoff, secret: string) {
  if (!secret) return null
  const clean = cleanHeroContact(input)
  if (!clean) return null
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", keyFor(secret), iv)
  const plaintext = Buffer.from(JSON.stringify(clean), "utf8")
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".")
}

export function openHeroContact(value: string | null | undefined, secret: string): HeroContactHandoff | null {
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
    const parsed = JSON.parse(plaintext) as { method?: unknown; value?: unknown }\n    return cleanHeroContact({ method: parsed.method, value: parsed.value })
  } catch {
    return null
  }
}
