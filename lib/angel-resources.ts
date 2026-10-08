// Turns Angel's resource search results into short text: a compact summary for the AI provider and a
// spoken summary for read-aloud. The AI provider gets only names, distances, phone numbers and sources:
// never the person's location or the places' street addresses, which would reveal the area.
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
      places: group.results.slice(0, 3).map(({ name, phone, distanceMiles, source }) => ({ name, phone, distanceMiles, source })),
      directories: group.results.length === 0 ? group.fallback.map((link) => link.title) : undefined,
    })),
  }
}

const miles = (value: number | undefined) => value === undefined ? "" : `, ${value < 0.1 ? "under a tenth of a mile" : `${value} mile${value === 1 ? "" : "s"}`} away`

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const

/** "2024-05-17" -> "May 2024", parsed from the string itself so the wording never depends on the server timezone. */
function mapMonthYear(isoDate: string): string {
  const [year, month] = isoDate.split("-")
  const index = Number(month) - 1
  return /^\d{4}$/.test(year ?? "") && index >= 0 && index < MONTHS.length ? `${MONTHS[index]} ${year}` : isoDate
}

/** A short spoken line per need: the nearest listing, or that none was found. Read after Angel's reply. */
export function spokenResourceSummary(resources: AngelResources | undefined): string {
  if (!resources) return ""
  const lines = resources.groups.map((group) => {
    const first = group.results[0]
    const need = group.shortLabel.toLowerCase()
    if (!first) return group.status === "ok" ? `No listing for ${need} was found nearby; directory links are on screen.` : `The ${need} search is not available right now; directory links are on screen.`
    const extras = [
      first.wheelchair === "yes" ? "wheelchair accessible per map data" : undefined,
      first.lastUpdated ? `map data from ${mapMonthYear(first.lastUpdated)}` : undefined,
    ].filter((part): part is string => part !== undefined)
    return `For ${need}: ${first.name}${miles(first.distanceMiles)}${group.widenedMiles ? ", farther away than usual" : ""}${extras.length ? `, ${extras.join(", ")}` : ""}.`
  })
  return lines.length ? `${lines.join(" ")} Call first to confirm.` : ""
}
