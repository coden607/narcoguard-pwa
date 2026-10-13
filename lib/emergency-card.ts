// Feature 19: Offline medication and emergency contact card.
// Two layers:
//  1. Plaintext card schema — validated client-side BEFORE sealing so bad
//     data never enters the ciphertext.
//  2. Envelope — the only part the server ever sees.

export const CARD_TYPE = "emergency-card/v1" as const
export const MAX_CIPHERTEXT_CHARS = 100_000

export const LIMITS = {
  medications: 25,
  medicationName: 100,
  dose: 50,
  schedule: 100,
  allergies: 20,
  allergy: 100,
  conditions: 20,
  condition: 100,
  contacts: 20,
  contactName: 100,
  relationship: 50,
  phone: 20,
  notes: 1000,
} as const

export type Medication = { name: string; dose?: string; schedule?: string }
export type EmergencyContact = { name: string; relationship?: string; phone: string }
export type EmergencyCard = {
  medications: Medication[]
  allergies: string[]
  conditions: string[]
  contacts: EmergencyContact[]
  notes?: string
}

const clean = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null
  const v = value.replace(/[ -]/g, " ").replace(/\s+/g, " ").trim()
  if (v.length < 1 || v.length > max) return null
  return v
}

/** Loose E.164-family check: digits with optional +, spaces, dashes, dots, parens. */
export function isValidPhone(value: unknown): value is string {
  if (typeof value !== "string") return false
  const v = value.trim()
  if (v.length < 5 || v.length > LIMITS.phone) return false
  return /^\+?[0-9 ().-]+$/.test(v) && (v.match(/\d/g)?.length ?? 0) >= 5
}

/**
 * Validate and normalize a plaintext card. Returns the normalized card or a
 * list of problems; never throws. Call this before sealing on the client.
 */
export function validateCard(raw: unknown): { ok: true; card: EmergencyCard } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const src = (raw ?? {}) as Record<string, unknown>

  const medications: Medication[] = []
  if (src.medications !== undefined) {
    if (!Array.isArray(src.medications)) errors.push("medications must be an array")
    else if (src.medications.length > LIMITS.medications) errors.push(`at most ${LIMITS.medications} medications`)
    else {
      for (const [i, m] of src.medications.entries()) {
        const name = clean((m as Record<string, unknown>)?.name, LIMITS.medicationName)
        if (!name) { errors.push(`medications[${i}].name is required (1-${LIMITS.medicationName} chars)`); continue }
        const dose = clean((m as Record<string, unknown>)?.dose ?? null, LIMITS.dose)
        const schedule = clean((m as Record<string, unknown>)?.schedule ?? null, LIMITS.schedule)
        medications.push({ name, ...(dose ? { dose } : {}), ...(schedule ? { schedule } : {}) })
      }
    }
  }

  const strings = (key: "allergies" | "conditions", maxItems: number, maxChars: number): string[] => {
    const value = src[key]
    if (value === undefined) return []
    if (!Array.isArray(value)) { errors.push(`${key} must be an array`); return [] }
    if (value.length > maxItems) { errors.push(`at most ${maxItems} ${key}`); return [] }
    const out: string[] = []
    for (const [i, item] of value.entries()) {
      const s = clean(item, maxChars)
      if (!s) { errors.push(`${key}[${i}] must be 1-${maxChars} chars`); continue }
      out.push(s)
    }
    return out
  }
  const allergies = strings("allergies", LIMITS.allergies, LIMITS.allergy)
  const conditions = strings("conditions", LIMITS.conditions, LIMITS.condition)

  const contacts: EmergencyContact[] = []
  if (src.contacts !== undefined) {
    if (!Array.isArray(src.contacts)) errors.push("contacts must be an array")
    else if (src.contacts.length > LIMITS.contacts) errors.push(`at most ${LIMITS.contacts} contacts`)
    else {
      for (const [i, c] of src.contacts.entries()) {
        const rec = (c ?? {}) as Record<string, unknown>
        const name = clean(rec.name, LIMITS.contactName)
        const phone = isValidPhone(rec.phone) ? rec.phone.trim() : null
        if (!name) { errors.push(`contacts[${i}].name is required`); continue }
        if (!phone) { errors.push(`contacts[${i}].phone is invalid`); continue }
        const relationship = clean(rec.relationship ?? null, LIMITS.relationship)
        contacts.push({ name, ...(relationship ? { relationship } : {}), phone })
      }
    }
  }

  const notes = clean(src.notes ?? null, LIMITS.notes)

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, card: { medications, allergies, conditions, contacts, ...(notes ? { notes } : {}) } }
}

export type CardEnvelope = {
  type: typeof CARD_TYPE
  version: number
  ciphertext: string
  updatedAt: string
}

/** Envelope validation — the only thing the API route applies. */
export function validateEnvelope(raw: unknown): CardEnvelope | null {
  if (typeof raw !== "object" || raw === null) return null
  const e = raw as Record<string, unknown>
  if (e.type !== CARD_TYPE) return null
  if (!Number.isInteger(e.version) || (e.version as number) <= 0) return null
  if (typeof e.ciphertext !== "string" || e.ciphertext.length < 1 || e.ciphertext.length > MAX_CIPHERTEXT_CHARS) return null
  const updatedAt = typeof e.updatedAt === "string" && !Number.isNaN(Date.parse(e.updatedAt)) ? e.updatedAt : new Date(0).toISOString()
  return { type: CARD_TYPE, version: e.version as number, ciphertext: e.ciphertext, updatedAt }
}

/** Offline copy on the user's device. Quota-guarded; never throws. */
export const OFFLINE_STORAGE_KEY = "narcoguard.emergency-card.v1"

export function saveOffline(envelope: CardEnvelope): boolean {
  try {
    if (typeof localStorage === "undefined") return false
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

export function loadOffline(): CardEnvelope | null {
  try {
    if (typeof localStorage === "undefined") return null
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY)
    return raw ? validateEnvelope(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function clearOffline(): void {
  try {
    if (typeof localStorage !== "undefined") localStorage.removeItem(OFFLINE_STORAGE_KEY)
  } catch {
    /* offline best-effort */
  }
}
