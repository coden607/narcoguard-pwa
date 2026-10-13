import type { KnownResource } from "./resource-inventory"
import type { ResourceFeedback } from "./resource-personalization"

export const OFFLINE_RESOURCE_PACK_KEY = "narcoguard_offline_resource_pack_v1"
export const OFFLINE_RESOURCE_PACK_MAX = 24

export type OfflineResource = {
  key: string
  zip: string
  name: string
  kind: string
  source: string
  lastSeenAt: string
  address?: string
  phone?: string
  website?: string
  hours?: string
  workedBefore: boolean
}

type StoredPack = {
  version: 1
  generatedAt: string
  resources: OfflineResource[]
}

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const validIso = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value))

export function buildOfflineResourcePack(
  inventory: readonly KnownResource[],
  feedback: readonly ResourceFeedback[],
  generatedAt = new Date().toISOString(),
): StoredPack {
  const worked = new Set(feedback.filter((row) => row.value === "worked").map((row) => row.key))
  const excluded = new Set(feedback.filter((row) => row.value === "closed" || row.value === "not-for-me").map((row) => row.key))

  const resources = inventory
    .filter((row) => !excluded.has(row.key))
    .sort((a, b) => {
      const aWorked = worked.has(a.key) ? 1 : 0
      const bWorked = worked.has(b.key) ? 1 : 0
      return bWorked - aWorked || b.lastSeenAt.localeCompare(a.lastSeenAt)
    })
    .slice(0, OFFLINE_RESOURCE_PACK_MAX)
    .map((row): OfflineResource => ({
      key: row.key,
      zip: row.zip,
      name: row.resource.name,
      kind: row.resource.kind,
      source: row.resource.source,
      lastSeenAt: row.lastSeenAt,
      ...(row.resource.address ? { address: row.resource.address } : {}),
      ...(row.resource.phone ? { phone: row.resource.phone } : {}),
      ...(row.resource.website ? { website: row.resource.website } : {}),
      ...(row.resource.hours ? { hours: row.resource.hours } : {}),
      workedBefore: worked.has(row.key),
    }))

  return {
    version: 1,
    generatedAt: validIso(generatedAt) ? generatedAt : new Date(0).toISOString(),
    resources,
  }
}

export function saveOfflineResourcePack(
  storage: StorageLike,
  inventory: readonly KnownResource[],
  feedback: readonly ResourceFeedback[],
  generatedAt?: string,
): StoredPack {
  const pack = buildOfflineResourcePack(inventory, feedback, generatedAt)
  storage.setItem(OFFLINE_RESOURCE_PACK_KEY, JSON.stringify(pack))
  return pack
}

export function readOfflineResourcePack(storage: Pick<StorageLike, "getItem">): StoredPack | null {
  try {
    const parsed = JSON.parse(storage.getItem(OFFLINE_RESOURCE_PACK_KEY) || "null") as StoredPack | null
    if (!parsed || parsed.version !== 1 || !validIso(parsed.generatedAt) || !Array.isArray(parsed.resources)) return null

    const resources = parsed.resources.flatMap((row): OfflineResource[] => {
      if (!row || typeof row !== "object") return []
      if (
        typeof row.key !== "string" ||
        typeof row.zip !== "string" ||
        typeof row.name !== "string" ||
        typeof row.kind !== "string" ||
        typeof row.source !== "string" ||
        !validIso(row.lastSeenAt)
      ) return []

      return [{
        key: row.key.slice(0, 400),
        zip: row.zip.slice(0, 10),
        name: row.name.slice(0, 180),
        kind: row.kind.slice(0, 80),
        source: row.source.slice(0, 180),
        lastSeenAt: row.lastSeenAt,
        ...(typeof row.address === "string" ? { address: row.address.slice(0, 240) } : {}),
        ...(typeof row.phone === "string" ? { phone: row.phone.slice(0, 60) } : {}),
        ...(typeof row.website === "string" ? { website: row.website.slice(0, 400) } : {}),
        ...(typeof row.hours === "string" ? { hours: row.hours.slice(0, 120) } : {}),
        workedBefore: row.workedBefore === true,
      }]
    }).slice(0, OFFLINE_RESOURCE_PACK_MAX)

    return { version: 1, generatedAt: parsed.generatedAt, resources }
  } catch {
    return null
  }
}

export function offlineResourceAgeLabel(lastSeenAt: string, now = Date.now()) {
  const age = now - Date.parse(lastSeenAt)
  if (!Number.isFinite(age) || age < 0) return "age unknown"
  const minutes = Math.floor(age / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)} min old`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `${hours} hr old`
  return `${Math.floor(hours / 24)} days old`
}
