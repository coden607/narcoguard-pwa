/**
 * Required Notice: Copyright 2026 Stephen Blanford.
 * SPDX-License-Identifier: LicenseRef-PolyForm-Noncommercial-1.0.0
 * Browser-only, explicitly opted-in decision vault. Never auto-save health data.
 */
export const COMPASS_VAULT_KEY = "narcoguard_life_compass_vault_v1"
const LABEL = "life-compass-vault/v1"
const ITERATIONS = 310000
export type Horizon = "24 hours" | "30 days" | "90 days" | "1 year"
export type CompassEntry = {
  id: string
  createdAt: string
  situation: string
  hypothesis: string
  indicator: string
  firstStep: string
  horizon: Horizon
  verification: "person-reported-unverified"
  outcomes: { observedAt: string; observation: string; verification: "person-reported-unverified" }[]
}
export type CompassLedger = { version: 1; entries: CompassEntry[] }
export type SealedCompassLedger = { format: string; kdf: "PBKDF2-SHA256"; cipher: "AES-256-GCM"; iterations: number; salt: string; iv: string; ciphertext: string }

const enc = new TextEncoder()
const dec = new TextDecoder("utf-8", { fatal: true })
const textOK = (value: string, max: number): boolean => typeof value === "string" && value.trim().length > 0 && value.length <= max
const strongPass = (passphrase: string): boolean => typeof passphrase === "string" && passphrase.length >= 12 && passphrase.length <= 1024
const b64 = (data: Uint8Array): string => btoa(Array.from(data, ch => String.fromCharCode(ch)).join(""))
function from64(value: string, max = 1400000): Uint8Array {
  if (typeof value !== "string" || value.length > max || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw Error("Invalid encrypted backup")
  return Uint8Array.from(atob(value), ch => ch.charCodeAt(0))
}
const validLedger = (value: unknown): value is CompassLedger => Boolean(
  value && typeof value === "object" && !Array.isArray(value) &&
  (value as CompassLedger).version === 1 &&
  Array.isArray((value as CompassLedger).entries) &&
  (value as CompassLedger).entries.length <= 50 &&
  (value as CompassLedger).entries.every(entry => entry && typeof entry.id === "string" && textOK(entry.situation, 500) &&
    Array.isArray(entry.outcomes) && entry.outcomes.length <= 100)
)
export function blankCompassLedger(): CompassLedger { return { version: 1, entries: [] } }
export function addCompassEntry(ledger: CompassLedger, input: Pick<CompassEntry, "situation" | "hypothesis" | "indicator" | "firstStep" | "horizon">,
  now = new Date().toISOString(), id = globalThis.crypto.randomUUID()): CompassLedger {
  if (!validLedger(ledger) || ledger.entries.length >= 50) throw Error("Ledger is full or invalid")
  if (!textOK(input.situation, 500) || !textOK(input.hypothesis, 500) || !textOK(input.indicator, 500) ||
      !textOK(input.firstStep, 250) || !["24 hours", "30 days", "90 days", "1 year"].includes(input.horizon)) throw Error("Complete all decision and forecast fields")
  if (ledger.entries.some(e => e.id === id)) throw Error("Duplicate entry")
  return { version: 1, entries: [...ledger.entries, {
    id, createdAt: now, situation: input.situation.trim(), hypothesis: input.hypothesis.trim(),
    indicator: input.indicator.trim(), firstStep: input.firstStep.trim(), horizon: input.horizon,
    verification: "person-reported-unverified", outcomes: [],
  }] }
}
export function addCompassOutcome(ledger: CompassLedger, entryId: string, observedAt: string, observation: string): CompassLedger {
  if (!validLedger(ledger) || !textOK(observation, 500) || !/^\d{4}-\d{2}-\d{2}$/.test(observedAt)) throw Error("Enter an outcome and valid date")
  if (!ledger.entries.some(e => e.id === entryId)) throw Error("Decision not found")
  return { version: 1, entries: ledger.entries.map(e => e.id !== entryId ? e : ({
    ...e, outcomes: [...e.outcomes.slice(-99), { observedAt, observation: observation.trim(), verification: "person-reported-unverified" as const }],
  })) }
}
async function derive(passphrase: string, salt: Uint8Array, api: Crypto): Promise<CryptoKey> {
  const key = await api.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"])
  return api.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", iterations: ITERATIONS, salt: salt as BufferSource },
    key, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"])
}
export async function sealCompassLedger(ledger: CompassLedger, passphrase: string, api: Crypto = globalThis.crypto): Promise<SealedCompassLedger> {
  if (!strongPass(passphrase)) throw Error("A passphrase of at least 12 characters is required")
  if (!validLedger(ledger)) throw Error("Invalid decision ledger")
  const plaintext = enc.encode(JSON.stringify(ledger))
  if (plaintext.length > 800000) throw Error("Vault too large")
  const salt = api.getRandomValues(new Uint8Array(16))
  const iv = api.getRandomValues(new Uint8Array(12))
  const key = await derive(passphrase, salt, api)
  const ct = await api.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource, additionalData: enc.encode(LABEL) }, key, plaintext)
  return { format: LABEL, kdf: "PBKDF2-SHA256", cipher: "AES-256-GCM", iterations: ITERATIONS,
    salt: b64(salt), iv: b64(iv), ciphertext: b64(new Uint8Array(ct)) }
}
export async function openCompassLedger(envelope: unknown, passphrase: string, api: Crypto = globalThis.crypto): Promise<CompassLedger> {
  if (!strongPass(passphrase)) throw Error("A passphrase of at least 12 characters is required")
  const item = envelope as Partial<SealedCompassLedger> | null
  if (!item || item.format !== LABEL || item.kdf !== "PBKDF2-SHA256" || item.cipher !== "AES-256-GCM" ||
      item.iterations !== ITERATIONS) throw Error("Unsupported vault backup")
  const salt = from64(item.salt || ""), iv = from64(item.iv || ""), ciphertext = from64(item.ciphertext || "")
  if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17 || ciphertext.length > 800100) throw Error("Invalid encrypted backup")
  try {
    const key = await derive(passphrase, salt, api)
    const plaintext = await api.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource, additionalData: enc.encode(LABEL) },
      key, ciphertext as BufferSource)
    const result: unknown = JSON.parse(dec.decode(plaintext))
    if (!validLedger(result)) throw Error("Invalid ledger data")
    return result
  } catch { throw Error("Unable to decrypt: wrong passphrase or damaged data") }
}
export function readCompassEnvelope(storage: Pick<Storage, "getItem">): unknown | null {
  const raw = storage.getItem(COMPASS_VAULT_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as unknown } catch { return null }
}
export function storeCompassEnvelope(storage: Pick<Storage, "setItem">, sealed: SealedCompassLedger): void {
  if (!sealed || sealed.format !== LABEL || sealed.cipher !== "AES-256-GCM") throw Error("Unencrypted input rejected")
  storage.setItem(COMPASS_VAULT_KEY, JSON.stringify(sealed))
}
