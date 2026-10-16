import type { NearbyResource } from "./resource-finder"

export const RESOURCE_PREFS_KEY = "narcoguard_resource_preferences_v1"
export const RESOURCE_FEEDBACK_KEY = "narcoguard_resource_feedback_v1"

export type ResourceFeedbackValue = "worked" | "closed" | "too-far" | "not-for-me"

export interface ResourcePreferences {
  maxDistanceMiles: number | null
  preferFreeFood: boolean
}

export interface ResourceFeedback {
  key: string
  value: ResourceFeedbackValue
  updatedAt: string
}

export interface SimpleStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export function defaultResourcePreferences(): ResourcePreferences {
  return { maxDistanceMiles: null, preferFreeFood: false }
}

export function resourceKey(resource: Pick<NearbyResource, "name" | "address" | "kind">) {
  return [resource.kind, resource.name.trim().toLowerCase(), (resource.address ?? "").trim().toLowerCase()].join("|")
}

export function readResourcePreferences(storage: SimpleStorage): ResourcePreferences {
  try {
    const value = JSON.parse(storage.getItem(RESOURCE_PREFS_KEY) || "null") as Partial<ResourcePreferences> | null
    const max = value?.maxDistanceMiles
    return {
      maxDistanceMiles: typeof max === "number" && Number.isFinite(max) && max > 0 && max <= 100 ? max : null,
      preferFreeFood: value?.preferFreeFood === true,
    }
  } catch {
    return defaultResourcePreferences()
  }
}

export function saveResourcePreferences(storage: SimpleStorage, value: ResourcePreferences) {
  storage.setItem(RESOURCE_PREFS_KEY, JSON.stringify(value))
}

export function readResourceFeedback(storage: SimpleStorage): ResourceFeedback[] {
  try {
    const value = JSON.parse(storage.getItem(RESOURCE_FEEDBACK_KEY) || "[]")
    if (!Array.isArray(value)) return []
    return value.flatMap((item): ResourceFeedback[] => {
      if (!item || typeof item !== "object") return []
      const row = item as ResourceFeedback
      if (!row.key || !["worked", "closed", "too-far", "not-for-me"].includes(row.value)) return []
      return [{ key: row.key.slice(0, 400), value: row.value, updatedAt: typeof row.updatedAt === "string" ? row.updatedAt : "" }]
    }).slice(-500)
  } catch {
    return []
  }
}

export function saveResourceFeedback(storage: SimpleStorage, feedback: ResourceFeedback) {
  const current = readResourceFeedback(storage).filter((item) => item.key !== feedback.key)
  storage.setItem(RESOURCE_FEEDBACK_KEY, JSON.stringify([...current, feedback].slice(-500)))
}

export function rankResources(
  resources: readonly NearbyResource[],
  preferences: ResourcePreferences,
  feedback: readonly ResourceFeedback[],
): NearbyResource[] {
  const byKey = new Map(feedback.map((item) => [item.key, item.value]))
  return resources
    .filter((resource) => {
      const value = byKey.get(resourceKey(resource))
      if (value === "closed" || value === "not-for-me") return false
      if (preferences.maxDistanceMiles !== null && resource.distanceMiles !== undefined && resource.distanceMiles > preferences.maxDistanceMiles) return false
      return true
    })
    .sort((a, b) => {
      const aFeedback = byKey.get(resourceKey(a))
      const bFeedback = byKey.get(resourceKey(b))
      const aScore = aFeedback === "worked" ? -2 : aFeedback === "too-far" ? 2 : 0
      const bScore = bFeedback === "worked" ? -2 : bFeedback === "too-far" ? 2 : 0
      return aScore - bScore || (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999)
    })
}


export function explainResource(resource: NearbyResource, preferences: ResourcePreferences, feedback: readonly ResourceFeedback[]): string[] {
  const reasons: string[] = []
  const value = new Map(feedback.map((item) => [item.key, item.value])).get(resourceKey(resource))
  if (value === "worked") reasons.push("You marked this option as having worked before.")
  if (resource.distanceMiles !== undefined) {
    if (preferences.maxDistanceMiles !== null) reasons.push(`Within your ${preferences.maxDistanceMiles}-mile preference.`)
    else reasons.push(`${resource.distanceMiles} miles away by straight-line distance.`)
  }
  if (resource.kind === "food" && preferences.preferFreeFood) reasons.push("Matches your preference for free/community food first.")
  if (resource.kind === "quick-meal") reasons.push("A quick-meal option; price, route time, and current hours are not verified.")
  return reasons.slice(0, 3)
}
