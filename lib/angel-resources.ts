// Turns Angel's resource search results into short text: a compact summary for the AI provider and a
// spoken summary for read-aloud. Only names, distances, phone numbers and sources are shared, never the
// person's location.
import { RESOURCE_LABELS, SHORT_LABELS, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"

export const RESULTS_PER_GROUP = 5

export interface AngelResourceGroup {
  kind: ResourceKind
  label: string
  shortLabel: string
  status: "ok" | "unavailable"
  results: NearbyResource[]
  widenedMiles?: number
  fallback: { title: string; url: string }[]
}

export interface AngelResources {
  status: "ok" | "partial" | "unavailable"
  message?: string
  groups: AngelResourceGroup[]
}

export function toAngelResources(lookup: { status: AngelResources["status"]; message?: string; groups: { kind: ResourceKind; status: "ok" | "unavailable"; results: NearbyResource[]; widenedMiles?: number; fallback: { title: string; url: string }[] }[] }): AngelResources {
  return {
    status: lookup.status,
    ...(lookup.message ? { message: lookup.message } : {}),
    groups: lookup.groups.map((group) => ({
      kind: group.kind,
      label: RESOURCE_LABELS[group.kind],
      shortLabel: SHORT_LABELS[group.kind],
      status: group.status,
      results: group.results.slice(0, RESULTS_PER_GROUP),
      ...(group.widenedMiles ? { widenedMiles: group.widenedMiles } : {}),
      fallback: group.fallback,
    })),
  }
}

/** What the AI provider sees: the top three places per need, with no coordinates. */
export function resourcesForModel(resources: AngelResources) {
  return {
    status: resources.status,
    groups: resources.groups.map((group) => ({
      need: group.shortLabel,
      status: group.status,
      ...(group.widenedMiles ? { searchedUpToMiles: group.widenedMiles } : {}),
      places: group.results.slice(0, 3).map(({ name, address, phone, distanceMiles, source }) => ({ name, address, phone, distanceMiles, source })),
      directories: group.results.length === 0 ? group.fallback.map((link) => link.title) : undefined,
    })),
  }
}

const miles = (value: number | undefined) => value === undefined ? "" : `, ${value < 0.1 ? "under a tenth of a mile" : `${value} mile${value === 1 ? "" : "s"}`} away`

/** A short spoken line per need: the nearest listing, or that none was found. Read after Angel's reply. */
export function spokenResourceSummary(resources: AngelResources | undefined, maxGroups = 4): string {
  if (!resources) return ""
  const lines = resources.groups.slice(0, maxGroups).map((group) => {
    const first = group.results[0]
    const need = group.shortLabel.toLowerCase()
    if (!first) return group.status === "ok" ? `No listing for ${need} was found nearby; directory links are on screen.` : `The ${need} search is not available right now; directory links are on screen.`
    return `For ${need}: ${first.name}${miles(first.distanceMiles)}${group.widenedMiles ? ", farther away than usual" : ""}.`
  })
  return lines.length ? `${lines.join(" ")} Call first to confirm.` : ""
}
