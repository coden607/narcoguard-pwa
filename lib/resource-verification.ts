import { resourceKey, type SimpleStorage } from "./resource-personalization"
import type { NearbyResource } from "./resource-finder"

export const RESOURCE_VERIFICATIONS_KEY = "narcoguard_resource_verifications_v1"
export const RESOURCE_VERIFICATION_TTL_MS = 12 * 60 * 60_000

export type ResourceVerificationStatus = "confirmed-open" | "confirmed-closed" | "could-not-confirm"
export type ResourceVerificationMethod = "phone" | "website" | "in-person" | "other"

export type ResourceVerification = {
  key: string
  status: ResourceVerificationStatus
  method: ResourceVerificationMethod
  verifiedAt: string
  expiresAt: string
  note: string
}

export function readResourceVerifications(storage: SimpleStorage): ResourceVerification[] {
  try {
    const raw = JSON.parse(storage.getItem(RESOURCE_VERIFICATIONS_KEY) || "[]")
    if (!Array.isArray(raw)) return []
    return raw.flatMap((item): ResourceVerification[] => {
      if (!item || typeof item !== "object") return []
      const row = item as ResourceVerification
      if (typeof row.key !== "string" || row.key.length > 400) return []
      if (!["confirmed-open","confirmed-closed","could-not-confirm"].includes(row.status)) return []
      if (!["phone","website","in-person","other"].includes(row.method)) return []
      if (Number.isNaN(Date.parse(row.verifiedAt)) || Number.isNaN(Date.parse(row.expiresAt))) return []
      return [{ ...row, note: typeof row.note === "string" ? row.note.slice(0, 240) : "" }]
    }).slice(-200)
  } catch {
    return []
  }
}

export function saveResourceVerification(
  storage: SimpleStorage,
  resource: NearbyResource,
  status: ResourceVerificationStatus,
  method: ResourceVerificationMethod,
  note = "",
  now = new Date(),
): ResourceVerification[] {
  const key = resourceKey(resource)
  const verifiedAt = now.toISOString()
  const expiresAt = new Date(now.getTime() + RESOURCE_VERIFICATION_TTL_MS).toISOString()
  const current = readResourceVerifications(storage).filter((item) => item.key !== key)
  const next = [...current, { key, status, method, verifiedAt, expiresAt, note: note.trim().slice(0, 240) }].slice(-200)
  storage.setItem(RESOURCE_VERIFICATIONS_KEY, JSON.stringify(next))
  return next
}

export function activeResourceVerification(
  verifications: readonly ResourceVerification[],
  resource: NearbyResource,
  now = new Date(),
): ResourceVerification | null {
  const row = [...verifications].reverse().find((item) => item.key === resourceKey(resource))
  if (!row) return null
  return Date.parse(row.expiresAt) > now.getTime() ? row : null
}

export function verificationLabel(row: ResourceVerification): string {
  if (row.status === "confirmed-open") return "You confirmed this listing was open / answering"
  if (row.status === "confirmed-closed") return "You confirmed this listing was closed"
  return "You tried to confirm this listing but could not verify it"
}
