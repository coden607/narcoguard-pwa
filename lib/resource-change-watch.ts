import type { NearbyResource } from "./resource-finder"
import { inventoryFreshness, type KnownResource } from "./resource-inventory"
import { resourceKey, type SimpleStorage } from "./resource-personalization"

export const RESOURCE_CHANGE_WATCH_KEY = "narcoguard_resource_change_watches_v1"

export type ResourceChange =
  | { key: string; type: "changed"; fields: string[]; message: string }
  | { key: string; type: "not-returned"; fields: []; message: string }
  | { key: string; type: "returned"; fields: []; message: string }
  | { key: string; type: "stale"; fields: []; message: string }

const MATERIAL_FIELDS = ["hours", "phone", "website", "address", "services"] as const

export function readResourceChangeWatches(storage: SimpleStorage): string[] {
  try {
    const value = JSON.parse(storage.getItem(RESOURCE_CHANGE_WATCH_KEY) || "[]")
    return Array.isArray(value)
      ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length <= 400))].slice(-100)
      : []
  } catch {
    return []
  }
}

export function setResourceChangeWatch(storage: SimpleStorage, key: string, enabled: boolean): string[] {
  const current = readResourceChangeWatches(storage).filter((item) => item !== key)
  const next = enabled ? [...current, key].slice(-100) : current
  storage.setItem(RESOURCE_CHANGE_WATCH_KEY, JSON.stringify(next))
  return next
}

function changedFields(previous: NearbyResource, latest: NearbyResource): string[] {
  return MATERIAL_FIELDS.filter((field) => (previous[field] ?? "") !== (latest[field] ?? ""))
}

export function detectResourceChanges({
  previous,
  latest,
  watchedKeys,
  zip,
  fetchedAt,
}: {
  previous: readonly KnownResource[]
  latest: readonly NearbyResource[]
  watchedKeys: readonly string[]
  zip: string
  fetchedAt: string
}): ResourceChange[] {
  const watched = new Set(watchedKeys)
  const latestByKey = new Map(latest.map((resource) => [resourceKey(resource), resource]))
  const out: ResourceChange[] = []

  for (const row of previous) {
    if (row.zip !== zip || !watched.has(row.key)) continue
    const current = latestByKey.get(row.key)
    const wasReturned = row.lastReturned !== false

    if (current) {
      if (!wasReturned) {
        out.push({
          key: row.key,
          type: "returned",
          fields: [],
          message: row.resource.name + " was returned again in the latest public-directory lookup.",
        })
      }
      const fields = changedFields(row.resource, current)
      if (fields.length > 0) {
        out.push({
          key: row.key,
          type: "changed",
          fields,
          message: row.resource.name + " changed in public-directory data: " + fields.join(", ") + ".",
        })
      }
      continue
    }

    if (wasReturned) {
      out.push({
        key: row.key,
        type: "not-returned",
        fields: [],
        message: row.resource.name + " was not returned in the latest lookup. This does not prove it closed or became unavailable.",
      })
    }

    const before = inventoryFreshness(row.lastSeenAt, new Date(row.lastLookupAt))
    const after = inventoryFreshness(row.lastSeenAt, new Date(fetchedAt))
    if (before !== "stale" && after === "stale") {
      out.push({
        key: row.key,
        type: "stale",
        fields: [],
        message: row.resource.name + " has not been returned for more than 24 hours of lookup time. Its current availability is unknown.",
      })
    }
  }

  return out
}
