// Presentation helpers for resource cards. Pure and deterministic: the only time reference is the
// injectable `now`, and lines sourced from map listings stay attributed to public map data so
// availability is never claimed without verification. No I/O, no Date.now() — a fixed reference
// instant is used when the caller does not inject one.

import { parseOpeningHours } from "./opening-hours"
import type { NearbyResource } from "./resource-finder"

export type OpenNowChip = { label: string; tone: "open" | "closed" | "unknown" }

export type ResourceCardSummary = {
  chip: OpenNowChip
  hours: string | null
  freshness: string | null
  wheelchair: string | null
  services: string | null
  unknowns: string[]
}

const MAX_LINE = 200

/**
 * Fixed reference instant (a Monday noon) used only to ask the hours parser whether a value is in
 * its supported subset; the chip's open/closed answer still comes solely from the injected `now`.
 */
const REFERENCE_NOW = new Date(2026, 0, 5, 12, 0, 0)

const TREATMENT_SOURCE_RE = /findtreatment|samhsa/i

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function cap(text: string): string {
  return text.length > MAX_LINE ? text.slice(0, MAX_LINE) : text
}

function listedHours(resource: NearbyResource): string {
  return typeof resource.hours === "string" ? resource.hours.trim() : ""
}

function hasServices(resource: NearbyResource): boolean {
  return typeof resource.services === "string" && resource.services.trim() !== ""
}

function isTreatmentKind(resource: NearbyResource): boolean {
  return resource.kind === "treatment" || (typeof resource.source === "string" && TREATMENT_SOURCE_RE.test(resource.source))
}

/**
 * The confidence chip for a resource card. "Open now"/"Closed now" only appear when the listed
 * hours parse and a reference time is available; anything else is an honest "unknown" — treatment
 * listings and places with services but no hours always say "call first" because their data source
 * carries no hours to trust.
 */
export function openNowChip(resource: NearbyResource, now?: Date): OpenNowChip {
  const hours = listedHours(resource)
  if (isTreatmentKind(resource) || (hasServices(resource) && !hours)) {
    return { label: cap("Hours unknown — call first"), tone: "unknown" }
  }
  if (!hours) return { label: cap("Hours unknown"), tone: "unknown" }
  try {
    const parsed = parseOpeningHours(resource.hours, now)
    if (parsed.openNow === null) return { label: cap("Hours unknown"), tone: "unknown" }
    return parsed.openNow ? { label: cap("Open now"), tone: "open" } : { label: cap("Closed now"), tone: "closed" }
  } catch {
    return { label: cap("Hours unknown"), tone: "unknown" }
  }
}

/**
 * The humanized hours line, from parseOpeningHours' display. "Open 24/7" for around-the-clock
 * listings; null when hours are absent or outside the parser's supported subset, so the caller
 * shows its unknown-hours line instead of raw map text.
 */
export function hoursLine(resource: NearbyResource, now?: Date): string | null {
  const hours = listedHours(resource)
  if (!hours) return null
  try {
    const parsed = parseOpeningHours(resource.hours, now ?? REFERENCE_NOW)
    if (parsed.is24_7) return cap("Open 24/7")
    if (parsed.openNow === null) return null
    const display = parsed.display.trim()
    return display === "" ? null : cap(display)
  } catch {
    return null
  }
}

/** "Map data from May 2024" — month and year only, never a day or time. Null when absent or malformed. */
export function freshnessLine(resource: NearbyResource): string | null {
  const updated = typeof resource.lastUpdated === "string" ? resource.lastUpdated.trim() : ""
  if (!updated) return null
  const match = DATE_RE.exec(updated)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (year < 1900 || month < 1 || month > 12) return null
  return cap(`Map data from ${MONTH_NAMES[month - 1]} ${year}`)
}

/** Wheelchair access exactly as tagged on the map listing — attributed to map data, never "verified". */
export function wheelchairLine(resource: NearbyResource): string | null {
  switch (resource.wheelchair) {
    case "yes":
      return cap("Wheelchair accessible per map data")
    case "limited":
      return cap("Limited wheelchair access per map data")
    case "no":
      return cap("Not marked wheelchair accessible in map data")
    default:
      return null
  }
}

/** The provider's own services summary (already capped at the source); null when not listed. */
export function servicesLine(resource: NearbyResource): string | null {
  const services = typeof resource.services === "string" ? resource.services : ""
  return services.trim() === "" ? null : cap(services)
}

/**
 * The fallback line for a missing contact field: phone and address point at the map link, a
 * missing website is simply omitted. Returns null whenever the field is present.
 */
export function unknownFieldLine(field: "phone" | "address" | "website", resource: NearbyResource): string | null {
  const value = field === "phone" ? resource.phone : field === "address" ? resource.address : resource.website
  if (typeof value === "string" && value.trim() !== "") return null
  if (field === "phone") return cap("No phone listed in public data — try the map link")
  if (field === "address") return cap("Address not in public data — check the map link")
  return null
}

/** Every display line a resource card needs, composed from the helpers above. */
export function cardSummary(resource: NearbyResource, now?: Date): ResourceCardSummary {
  const unknowns = (["phone", "address", "website"] as const)
    .map((field) => unknownFieldLine(field, resource))
    .filter((line): line is string => line !== null)
  return {
    chip: openNowChip(resource, now),
    hours: hoursLine(resource, now),
    freshness: freshnessLine(resource),
    wheelchair: wheelchairLine(resource),
    services: servicesLine(resource),
    unknowns,
  }
}
