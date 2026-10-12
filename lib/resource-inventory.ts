import type { NearbyResource, ResourceKind } from "./resource-finder"
import { resourceKey, type SimpleStorage } from "./resource-personalization"

export const RESOURCE_INVENTORY_KEY = "narcoguard_known_resource_inventory_v1"
export const RESOURCE_INVENTORY_MAX = 250

export type KnownResource = {
  key: string
  zip: string
  resource: NearbyResource
  firstSeenAt: string
  lastSeenAt: string
  lastLookupAt: string
}

type StoredInventory = {
  version: 1
  resources: KnownResource[]
}

function validIso(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function sanitizeResource(value: unknown): NearbyResource | null {
  if (!value || typeof value !== "object") return null
  const row = value as NearbyResource
  if (typeof row.name !== "string" || !row.name.trim()) return null
  if (typeof row.kind !== "string" || typeof row.source !== "string") return null

  const safe: NearbyResource = {
    name: row.name.slice(0, 180),
    kind: row.kind as ResourceKind,
    source: row.source,
  }
  if (typeof row.address === "string") safe.address = row.address.slice(0, 240)
  if (typeof row.phone === "string") safe.phone = row.phone.slice(0, 60)
  if (typeof row.website === "string") safe.website = row.website.slice(0, 400)
  if (typeof row.hours === "string") safe.hours = row.hours.slice(0, 120)
  if (typeof row.lastUpdated === "string") safe.lastUpdated = row.lastUpdated.slice(0, 10)
  if (row.wheelchair === "yes" || row.wheelchair === "limited" || row.wheelchair === "no") safe.wheelchair = row.wheelchair
  if (typeof row.services === "string") safe.services = row.services.slice(0, 240)
  if (typeof row.distanceMiles === "number" && Number.isFinite(row.distanceMiles)) safe.distanceMiles = row.distanceMiles
  if (typeof row.lat === "number" && Number.isFinite(row.lat)) safe.lat = row.lat
  if (typeof row.lon === "number" && Number.isFinite(row.lon)) safe.lon = row.lon
  return safe
}

export function readKnownResources(storage: SimpleStorage): KnownResource[] {
  try {
    const parsed = JSON.parse(storage.getItem(RESOURCE_INVENTORY_KEY) || "null") as StoredInventory | null
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.resources)) return []
    return parsed.resources.flatMap((item): KnownResource[] => {
      if (!item || typeof item !== "object") return []
      const row = item as KnownResource
      const resource = sanitizeResource(row.resource)
      if (!resource || typeof row.zip !== "string" || !/^\d{5}$/.test(row.zip)) return []
      if (!validIso(row.firstSeenAt) || !validIso(row.lastSeenAt) || !validIso(row.lastLookupAt)) return []
      return [{
        key: resourceKey(resource),
        zip: row.zip,
        resource,
        firstSeenAt: row.firstSeenAt,
        lastSeenAt: row.lastSeenAt,
        lastLookupAt: row.lastLookupAt,
      }]
    }).slice(-RESOURCE_INVENTORY_MAX)
  } catch {
    return []
  }
}

export function rememberKnownResources(
  storage: SimpleStorage,
  zip: string,
  resources: readonly NearbyResource[],
  fetchedAt: string,
): KnownResource[] {
  if (!/^\d{5}$/.test(zip) || !validIso(fetchedAt)) return readKnownResources(storage)

  const current = readKnownResources(storage)
  const byKey = new Map(current.map((row) => [row.key, row]))
  for (const resource of resources) {
    const safe = sanitizeResource(resource)
    if (!safe) continue
    const key = resourceKey(safe)
    const previous = byKey.get(key)
    byKey.set(key, {
      key,
      zip,
      resource: safe,
      firstSeenAt: previous?.firstSeenAt ?? fetchedAt,
      lastSeenAt: fetchedAt,
      lastLookupAt: fetchedAt,
    })
  }

  const next = [...byKey.values()]
    .sort((a, b) => a.lastSeenAt.localeCompare(b.lastSeenAt))
    .slice(-RESOURCE_INVENTORY_MAX)

  storage.setItem(RESOURCE_INVENTORY_KEY, JSON.stringify({ version: 1, resources: next }))
  return next
}

export function knownResourcesFor(
  inventory: readonly KnownResource[],
  zip: string,
  kinds: readonly ResourceKind[],
): KnownResource[] {
  const allowed = new Set(kinds)
  return inventory
    .filter((row) => row.zip === zip && allowed.has(row.resource.kind))
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
}

export function inventoryFreshness(lastSeenAt: string, now = new Date()): "fresh" | "aging" | "stale" {
  const age = now.getTime() - Date.parse(lastSeenAt)
  if (!Number.isFinite(age) || age < 0) return "stale"
  if (age <= 30 * 60_000) return "fresh"
  if (age <= 24 * 60 * 60_000) return "aging"
  return "stale"
}
