// Live nearby-resource lookup. Treatment comes from SAMHSA's FindTreatment.gov locator; food help,
// shelters and pharmacies come from OpenStreetMap via the Overpass API. Neither source confirms
// hours, openings or eligibility, so every result is labelled with its source and "call first".
// Location is rounded to about 1 km before it leaves the server and is never stored or logged.

export const RESOURCE_KINDS = ["treatment", "food", "shelter", "pharmacy"] as const
export type ResourceKind = typeof RESOURCE_KINDS[number]

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  treatment: "Treatment",
  food: "Food",
  shelter: "Shelter",
  pharmacy: "Pharmacy (naloxone is sold without a prescription; call to check stock)",
}

export interface NearbyResource {
  name: string
  kind: ResourceKind
  address?: string
  phone?: string
  website?: string
  distanceMiles?: number
  lat?: number
  lon?: number
  source: "SAMHSA FindTreatment.gov" | "OpenStreetMap contributors"
}

export const SEARCH_RADIUS_METERS = 16_000 // about 10 miles
export const MAX_RESULTS = 10

/** Rounds coordinates to 2 decimals (about 1.1 km) so precise location never leaves the server. */
export function coarsen(value: number): number {
  return Math.round(value * 100) / 100
}

export function haversineMiles(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(bLat - aLat)
  const dLon = toRad(bLon - aLon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLon / 2) ** 2
  return Math.round(3958.8 * 2 * Math.asin(Math.sqrt(h)) * 10) / 10
}

const OSM_FILTERS: Record<Exclude<ResourceKind, "treatment">, string[]> = {
  food: ['nwr["social_facility"~"^(food_bank|soup_kitchen)$"]', 'nwr["amenity"="food_bank"]'],
  shelter: ['nwr["social_facility"="shelter"]'],
  pharmacy: ['nwr["amenity"="pharmacy"]', 'nwr["healthcare"="pharmacy"]'],
}

export function overpassQuery(kind: Exclude<ResourceKind, "treatment">, lat: number, lon: number, radius = SEARCH_RADIUS_METERS): string {
  const around = `(around:${radius},${lat},${lon})`
  return `[out:json][timeout:15];(${OSM_FILTERS[kind].map((filter) => `${filter}${around};`).join("")});out center tags 60;`
}

const str = (value: unknown, max = 160) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined)
const num = (value: unknown) => {
  const parsed = typeof value === "string" ? Number(value) : value
  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined
}
const httpUrl = (value: unknown) => {
  const text = str(value, 300)
  if (!text) return undefined
  const withScheme = /^https?:\/\//i.test(text) ? text : `https://${text}`
  try {
    const url = new URL(withScheme)
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

interface OverpassElement { lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

export function parseOverpass(kind: Exclude<ResourceKind, "treatment">, body: unknown, origin: { lat: number; lon: number }): NearbyResource[] {
  const elements = (body as { elements?: OverpassElement[] } | null)?.elements
  if (!Array.isArray(elements)) return []
  const seen = new Set<string>()
  const results: NearbyResource[] = []
  for (const element of elements) {
    const tags = element.tags ?? {}
    const name = str(tags.name)
    const lat = element.lat ?? element.center?.lat
    const lon = element.lon ?? element.center?.lon
    if (!name || lat === undefined || lon === undefined) continue
    const key = `${name.toLowerCase()}|${lat.toFixed(3)}|${lon.toFixed(3)}`
    if (seen.has(key)) continue
    seen.add(key)
    const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ")
    const address = [street, tags["addr:city"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean).join(", ") || undefined
    results.push({
      name,
      kind,
      address,
      phone: str(tags.phone ?? tags["contact:phone"], 40),
      website: httpUrl(tags.website ?? tags["contact:website"]),
      lat,
      lon,
      distanceMiles: haversineMiles(origin.lat, origin.lon, lat, lon),
      source: "OpenStreetMap contributors",
    })
  }
  return results.sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0)).slice(0, MAX_RESULTS)
}

export function findTreatmentUrl(sAddr: string, radius = SEARCH_RADIUS_METERS): string {
  const params = new URLSearchParams({ sAddr, limitType: "2", limitValue: String(radius), pageSize: String(MAX_RESULTS), page: "1", sort: "0" })
  return `https://findtreatment.gov/locator/exportsAsJson/v2?${params}`
}

export function parseFindTreatment(body: unknown): NearbyResource[] {
  const rows = (body as { rows?: Record<string, unknown>[] } | null)?.rows
  if (!Array.isArray(rows)) return []
  return rows.flatMap((row) => {
    const name = [str(row.name1), str(row.name2)].filter(Boolean).join(" – ")
    if (!name) return []
    const street = [str(row.street1), str(row.street2)].filter(Boolean).join(", ")
    const address = [street, str(row.city), str(row.state), str(row.zip)].filter(Boolean).join(", ") || undefined
    const resource: NearbyResource = {
      name,
      kind: "treatment",
      address,
      phone: str(row.phone, 40),
      website: httpUrl(row.website),
      lat: num(row.latitude),
      lon: num(row.longitude),
      distanceMiles: num(row.miles) !== undefined ? Math.round((num(row.miles) as number) * 10) / 10 : undefined,
      source: "SAMHSA FindTreatment.gov",
    }
    return [resource]
  }).slice(0, MAX_RESULTS)
}

/** Directory pages a person can always use when live results are empty or unavailable. */
export function fallbackLinks(kind: ResourceKind, zip?: string) {
  const links = [{ title: "Find local help through 211", url: "https://www.211.org/get-help" }]
  if (kind === "treatment") links.unshift({ title: "Search FindTreatment.gov", url: `https://findtreatment.gov/locator${zip ? `?sAddr=${encodeURIComponent(zip)}` : ""}` })
  if (kind === "food") links.unshift({ title: "Feeding America food bank locator", url: "https://www.feedingamerica.org/find-your-local-foodbank" })
  if (kind === "shelter") links.unshift({ title: "HUD Find Shelter", url: "https://www.hud.gov/FindShelter" })
  return links
}
