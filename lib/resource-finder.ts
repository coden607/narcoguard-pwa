// Live nearby-resource lookup. Treatment comes from SAMHSA's FindTreatment.gov locator; everything
// else (food, shelter, water, toilets, clinics, libraries and more) comes from OpenStreetMap via the
// Overpass API. Neither source confirms
// hours, openings or eligibility, so every result is labelled with its source and "call first".
// Location is rounded to about 1 km before it leaves the server and is never stored or logged.

export const RESOURCE_KINDS = ["treatment", "food", "quick-meal", "shelter", "pharmacy", "water", "toilets", "showers", "laundry", "emergency", "clinic", "community", "library", "jobs"] as const
export type ResourceKind = typeof RESOURCE_KINDS[number]
export type OsmKind = Exclude<ResourceKind, "treatment">

export const RESOURCE_LABELS: Record<ResourceKind, string> = {
  treatment: "Treatment",
  food: "Free/community food",
  "quick-meal": "Quick meal / coffee options (price not verified)",
  shelter: "Shelter",
  pharmacy: "Pharmacy (naloxone is sold without a prescription; call to check stock)",
  water: "Drinking water",
  toilets: "Public toilets",
  showers: "Showers",
  laundry: "Laundry",
  emergency: "Emergency rooms (in an emergency, call 911)",
  clinic: "Clinics and health centers",
  community: "Community centers",
  library: "Libraries (free internet and computers)",
  jobs: "Job help",
}

export const SHORT_LABELS: Record<ResourceKind, string> = {
  treatment: "Treatment", food: "Free food", "quick-meal": "Quick meal", shelter: "Shelter", pharmacy: "Pharmacy", water: "Water", toilets: "Toilets", showers: "Showers",
  laundry: "Laundry", emergency: "Emergency room", clinic: "Clinics", community: "Community centers", library: "Libraries", jobs: "Job help",
}

/**
 * Maslow's hierarchy as a way to organize a search, not a ranking of people or an order anyone must
 * follow: every level is searched at once and any need can come first.
 */
export const NEED_LEVELS = [
  { id: "basic", title: "Basic needs", kinds: ["food", "quick-meal", "shelter", "water", "toilets", "showers", "laundry"] },
  { id: "safety", title: "Health and safety", kinds: ["emergency", "clinic", "pharmacy"] },
  { id: "connection", title: "Recovery and connection", kinds: ["treatment", "community"] },
  { id: "growth", title: "Growth and goals", kinds: ["library", "jobs"] },
] as const satisfies readonly { id: string; title: string; kinds: readonly ResourceKind[] }[]

export interface NearbyResource {
  name: string
  kind: ResourceKind
  address?: string
  phone?: string
  website?: string
  /** Opening hours as listed by the source; may be out of date. */
  hours?: string
  /** When the map listing was last edited (ISO date), when the source provides it. */
  lastUpdated?: string
  /** Wheelchair access as tagged on the map listing, when present. */
  wheelchair?: "yes" | "limited" | "no"
  /** Compact summary of the services a provider lists (treatment types and payment help). */
  services?: string
  distanceMiles?: number
  lat?: number
  lon?: number
  source: "SAMHSA FindTreatment.gov" | "OpenStreetMap contributors"
}

export const SEARCH_RADIUS_METERS = 16_000 // about 10 miles
export const MAX_RESULTS = 10
/** Listings shown per kind when every level is searched at once. */
export const MAX_RESULTS_PER_KIND = 5

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

interface OsmKindSpec {
  /** Each entry is a set of tags that must all match. A value starting with "~" is a case-insensitive regular expression. */
  filters: Record<string, string>[]
  /** Names that rule a place out even when its tags match, such as animal shelters. */
  excludeName?: string
  /** Tag values that rule a place out, e.g. toilets for customers only. */
  exclude?: Record<string, string[]>
  /** Dense kinds use a smaller radius so the nearest places are not crowded out. */
  radius: number
  /** Name shown for places that usually have none, such as a public drinking fountain; a function names only matching tags. */
  unnamed?: string | ((tags: Record<string, string>) => string | undefined)
}

const NOT_PUBLIC = { access: ["private", "no", "customers"] }

// Many shelters and meal programs are mapped only by name (a mission, a charity office, a church hall)
// rather than tagged as a shelter or food bank. Matching well-known names finds them; requiring an
// organisation-like tag keeps out streets and shops with the same words, and every listing says to call first.
const ORG_TAGS: Record<string, string>[] = [{ amenity: "~^(social_facility|place_of_worship|community_centre)$" }, { office: "~." }, { building: "~." }]
const byName = (pattern: string): Record<string, string>[] => ORG_TAGS.map((tags) => ({ ...tags, name: `~${pattern}` }))
const SHELTER_NAMES = "rescue mission|salvation army|ywca|catholic charities|volunteers of america|homeless|warming (center|centre)|emergency shelter|(men|women|family|youth)'?s shelter|shelter for"
const FOOD_NAMES = "food pantry|food bank|soup kitchen|community meal|free meal|food cupboard|salvation army|rescue mission|catholic charities"

export const OSM_KINDS: Record<OsmKind, OsmKindSpec> = {
  // Community fridges and pantries are mapped as food_sharing.
  food: { filters: [{ social_facility: "food_bank" }, { social_facility: "soup_kitchen" }, { amenity: "food_bank" }, { amenity: "food_sharing" }, ...byName(FOOD_NAMES)], radius: SEARCH_RADIUS_METERS, unnamed: (tags) => (tags.amenity === "food_sharing" ? "Food pantry or community fridge" : undefined) },
  "quick-meal": { filters: [{ amenity: "fast_food" }, { amenity: "cafe" }, { shop: "convenience" }, { shop: "supermarket" }], radius: 5_000 },
  // Hotels contracted as temporary shelters are often mapped this way and go stale when contracts end.
  // Services for people experiencing homelessness are listed too; every listing says to call first, so none promises a bed.
  shelter: {
    filters: [{ social_facility: "shelter" }, { amenity: "social_facility", "social_facility:for": "homeless" }, ...byName(SHELTER_NAMES)],
    exclude: { tourism: ["hotel"], amenity: ["animal_shelter"] },
    excludeName: "animal|humane|spca|pet (shelter|rescue|adoption)|(cat|dog) (shelter|rescue)|thrift|store",
    radius: SEARCH_RADIUS_METERS,
  },
  // Fountains, and parks or public buildings that are tagged as having drinking water.
  water: { filters: [{ amenity: "drinking_water" }, { amenity: "fountain", drinking_water: "yes" }, { drinking_water: "yes", leisure: "~^(park|playground|sports_centre)$" }, { drinking_water: "yes", amenity: "~^(library|community_centre|toilets|townhall)$" }], exclude: NOT_PUBLIC, radius: 2_000, unnamed: "Drinking water" },
  // Public toilets, and parks, libraries and stations tagged as having toilets (not shops or restaurants).
  toilets: { filters: [{ amenity: "toilets" }, { toilets: "yes", leisure: "~^(park|playground|sports_centre)$" }, { toilets: "yes", amenity: "~^(library|community_centre|townhall|bus_station|ferry_terminal)$" }], exclude: { ...NOT_PUBLIC, "toilets:access": ["private", "no", "customers"] }, radius: 2_000, unnamed: "Public toilet" },
  // Truck stops, campgrounds and pools tag showers on the main feature; some charge a fee.
  showers: { filters: [{ amenity: "shower" }, { shower: "yes" }, { shower: "hot" }], exclude: NOT_PUBLIC, radius: SEARCH_RADIUS_METERS, unnamed: "Public shower" },
  laundry: { filters: [{ shop: "laundry" }], radius: 5_000 },
  emergency: { filters: [{ amenity: "hospital", emergency: "yes" }], radius: SEARCH_RADIUS_METERS },
  clinic: { filters: [{ amenity: "clinic" }, { healthcare: "clinic" }, { healthcare: "centre" }], radius: 5_000 },
  pharmacy: { filters: [{ amenity: "pharmacy" }, { healthcare: "pharmacy" }], radius: 5_000 },
  community: { filters: [{ amenity: "community_centre" }, { social_facility: "outreach" }], radius: 5_000 },
  library: { filters: [{ amenity: "library" }], exclude: NOT_PUBLIC, radius: 6_000 },
  jobs: { filters: [{ office: "employment_agency" }], radius: SEARCH_RADIUS_METERS },
}

export const OSM_KIND_ORDER = RESOURCE_KINDS.filter((kind): kind is OsmKind => kind !== "treatment")

const quote = (value: string) => JSON.stringify(value)

/** South, west, north, east of a square around the point; Overpass answers bounding boxes from its spatial index. */
export function boundingBox(lat: number, lon: number, radiusMeters: number): [number, number, number, number] {
  const dLat = radiusMeters / 111_320
  const dLon = radiusMeters / (111_320 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01))
  const round = (value: number) => Math.round(value * 10_000) / 10_000
  return [round(lat - dLat), round(lon - dLon), round(lat + dLat), round(lon + dLon)]
}

// A bounding box, not (around:...): with a common tag such as amenity=toilets, "around" makes the
// public servers scan every match worldwide and time out. Corners are trimmed by distance afterwards.
function osmSelectors(kind: OsmKind, lat: number, lon: number, radius = OSM_KINDS[kind].radius): string {
  const { filters, exclude, excludeName } = OSM_KINDS[kind]
  const excluded = Object.entries(exclude ?? {}).map(([key, values]) => `[${quote(key)}!~${quote(`^(${values.join("|")})$`)}]`).join("")
    + (excludeName ? `["name"!~${quote(excludeName)},i]` : "")
  const box = boundingBox(lat, lon, radius).join(",")
  const selector = ([key, value]: [string, string]) => (value.startsWith("~") ? `[${quote(key)}~${quote(value.slice(1))},i]` : `[${quote(key)}=${quote(value)}]`)
  return filters.map((filter) => `nwr${Object.entries(filter).map(selector).join("")}${excluded}(${box});`).join("")
}

export function overpassQuery(kind: OsmKind, lat: number, lon: number, radius?: number): string {
  return `[out:json][timeout:20];(${osmSelectors(kind, lat, lon, radius)});out center meta;`
}

/**
 * Two lighter requests instead of one: everyday places close by, and sparser services searched
 * wider. In dense cities a single query for everything is too heavy for the public servers, and
 * splitting means one half can still answer if the other fails.
 */
export const OSM_QUERY_GROUPS: readonly (readonly OsmKind[])[] = [
  ["quick-meal", "water", "toilets", "pharmacy", "clinic", "laundry", "community", "library"],
  ["food", "shelter", "showers", "emergency", "jobs"],
]

export function overpassNeedsQuery(lat: number, lon: number, kinds: readonly OsmKind[] = OSM_KIND_ORDER, radius?: number): string {
  return `[out:json][timeout:20][maxsize:67108864];(${kinds.map((kind) => osmSelectors(kind, lat, lon, radius)).join("")});out center meta;`
}

/** Sparse services searched again, wider, when nothing is found within the normal radius. */
export const WIDEN_KINDS: readonly OsmKind[] = ["food", "shelter", "showers"]
export const WIDE_RADIUS_METERS = 40_000 // about 25 miles

/** Every kind a place matches, in display order: a truck stop can be a quick meal and a shower. */
export function osmKindsOf(tags: Record<string, string>): OsmKind[] {
  return OSM_KIND_ORDER.filter((kind) => {
    const { filters, exclude, excludeName } = OSM_KINDS[kind]
    if (Object.entries(exclude ?? {}).some(([key, values]) => values.includes(tags[key]))) return false
    if (excludeName && tags.name && new RegExp(excludeName, "i").test(tags.name)) return false
    return filters.some((filter) => Object.entries(filter).every(([key, value]) =>
      value.startsWith("~") ? tags[key] !== undefined && new RegExp(value.slice(1), "i").test(tags[key]) : tags[key] === value))
  })
}

/** The first kind a place belongs to, checked in display order; undefined when nothing matches. */
export function osmKindOf(tags: Record<string, string>): OsmKind | undefined {
  return osmKindsOf(tags)[0]
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

interface OverpassElement {
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
  /** Overpass "out meta" edit timestamp, an ISO datetime such as 2024-05-17T08:30:00Z. */
  timestamp?: string
}

function toResource(kind: OsmKind, element: OverpassElement, origin: { lat: number; lon: number }): NearbyResource | undefined {
  const tags = element.tags ?? {}
  const unnamed = OSM_KINDS[kind].unnamed
  const name = str(tags.name) ?? (typeof unnamed === "function" ? unnamed(tags) : unnamed)
  const lat = element.lat ?? element.center?.lat
  const lon = element.lon ?? element.center?.lon
  if (!name || lat === undefined || lon === undefined) return undefined
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ")
  const address = [street, tags["addr:city"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean).join(", ") || undefined
  return {
    name,
    kind,
    address,
    phone: str(tags.phone ?? tags["contact:phone"], 40),
    website: httpUrl(tags.website ?? tags["contact:website"]),
    hours: str(tags.opening_hours, 80),
    // Keep the raw hours string for backward compatibility; any display formatting happens downstream.
    ...(element.timestamp ? { lastUpdated: element.timestamp.slice(0, 10) } : {}),
    ...(tags.wheelchair === "yes" || tags.wheelchair === "limited" || tags.wheelchair === "no" ? { wheelchair: tags.wheelchair } : {}),
    lat,
    lon,
    distanceMiles: haversineMiles(origin.lat, origin.lon, lat, lon),
    source: "OpenStreetMap contributors",
  }
}

export function nearestUnique(resources: NearbyResource[], limit: number): NearbyResource[] {
  const seen = new Set<string>()
  return resources
    .sort((a, b) => (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0))
    .filter((resource) => {
      const key = `${resource.name.toLowerCase()}|${resource.lat?.toFixed(3)}|${resource.lon?.toFixed(3)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

const elementsOf = (body: unknown) => {
  const elements = (body as { elements?: OverpassElement[] } | null)?.elements
  return Array.isArray(elements) ? elements : []
}

/** Parses a single-kind query; the query already selected the kind, so tags are not re-checked. */
export function parseOverpass(kind: OsmKind, body: unknown, origin: { lat: number; lon: number }): NearbyResource[] {
  return nearestUnique(elementsOf(body).flatMap((element) => toResource(kind, element, origin) ?? []), MAX_RESULTS)
}

/** Sorts a combined query's places into kinds by their tags, nearest first. */
export function parseOverpassNeeds(body: unknown, origin: { lat: number; lon: number }, limit = MAX_RESULTS_PER_KIND, radius?: number): Record<OsmKind, NearbyResource[]> {
  const grouped = Object.fromEntries(OSM_KIND_ORDER.map((kind) => [kind, [] as NearbyResource[]])) as Record<OsmKind, NearbyResource[]>
  for (const element of elementsOf(body)) {
    for (const kind of osmKindsOf(element.tags ?? {})) {
      const resource = toResource(kind, element, origin)
      if (resource && (resource.distanceMiles ?? 0) <= (radius ?? OSM_KINDS[kind].radius) / 1609.344) grouped[kind].push(resource)
    }
  }
  for (const kind of OSM_KIND_ORDER) grouped[kind] = nearestUnique(grouped[kind], limit)
  return grouped
}

export const TREATMENT_PAGE_SIZE = 30

/** FindTreatment needs "lat,lon" in sAddr; a bare ZIP is ignored and silently falls back to a default location. */
export function findTreatmentUrl(lat: number, lon: number, radius = SEARCH_RADIUS_METERS): string {
  // A wider page lets substance use programs be ranked ahead of mental-health-only ones before trimming.
  const params = new URLSearchParams({ sAddr: `${lat},${lon}`, limitType: "2", limitValue: String(radius), pageSize: String(TREATMENT_PAGE_SIZE), page: "1", sort: "0" })
  return `https://findtreatment.gov/locator/exportsAsJson/v2?${params}`
}

/**
 * Compact services line from a FindTreatment row's services array. Entries pair a category (f1)
 * with a semicolon-delimited value list (f3); only "Type of Care" and payment-related categories
 * are used, joined in that order. The payload has no hours field, so none is invented here.
 */
const SERVICES_CAP = 160
function findTreatmentServices(row: Record<string, unknown>): string | undefined {
  const listed = row.services
  if (!Array.isArray(listed) || listed.length === 0) return undefined
  const valuesFor = (wanted: (category: string) => boolean) => listed.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const { f1, f3 } = entry as { f1?: unknown; f3?: unknown }
    if (typeof f1 !== "string" || typeof f3 !== "string" || !wanted(f1)) return []
    return f3.split(";").map((value) => value.trim()).filter(Boolean)
  })
  const parts = [...new Set([...valuesFor((category) => category === "Type of Care"), ...valuesFor((category) => category.includes("Payment"))])]
  let summary = ""
  for (const part of parts) {
    const next = summary ? `${summary}; ${part}` : part
    if (next.length > SERVICES_CAP) break
    summary = next
  }
  return summary || undefined
}

export function parseFindTreatment(body: unknown): NearbyResource[] {
  const rows = (body as { rows?: Record<string, unknown>[] } | null)?.rows
  if (!Array.isArray(rows)) return []
  const seen = new Set<string>()
  const parsed = rows.flatMap((row): NearbyResource[] => {
    const name = [str(row.name1), str(row.name2)].filter(Boolean).join(" – ")
    if (!name) return []
    const street = [str(row.street1), str(row.street2)].filter(Boolean).join(", ")
    const address = [street, str(row.city), str(row.state), str(row.zip)].filter(Boolean).join(", ") || undefined
    const services = findTreatmentServices(row)
    const resource: NearbyResource = {
      name,
      kind: "treatment",
      address,
      phone: str(row.phone, 40),
      website: httpUrl(row.website),
      ...(services ? { services } : {}),
      lat: num(row.latitude),
      lon: num(row.longitude),
      distanceMiles: num(row.miles) !== undefined ? Math.round((num(row.miles) as number) * 10) / 10 : undefined,
      source: "SAMHSA FindTreatment.gov",
    }
    const key = `${name}|${address ?? ""}`.toLowerCase()
    if (seen.has(key)) return []
    seen.add(key)
    return [resource]
  })
  // NarcoGuard's "treatment" means substance use care: programs listing it come first (still nearest
  // first within each group); mental-health-only programs stay listed below rather than hidden.
  const offersSubstanceUse = (resource: NearbyResource) => (resource.services ? /substance use|opioid|medication.assisted|detox/i.test(resource.services) : undefined)
  const rank = (resource: NearbyResource) => (offersSubstanceUse(resource) === true ? 0 : offersSubstanceUse(resource) === undefined ? 1 : 2)
  return parsed
    .map((resource, index) => ({ resource, index }))
    .sort((a, b) => rank(a.resource) - rank(b.resource) || a.index - b.index)
    .map(({ resource }) => resource)
    .slice(0, MAX_RESULTS)
}

/** Directory pages a person can always use when live results are empty or unavailable. */
export function fallbackLinks(kind: ResourceKind) {
  const directories: Partial<Record<ResourceKind, { title: string; url: string }[]>> = {
    treatment: [{ title: "Search FindTreatment.gov", url: "https://findtreatment.gov/" }],
    food: [{ title: "Feeding America food bank locator", url: "https://www.feedingamerica.org/find-your-local-foodbank" }],
    "quick-meal": [{ title: "Search nearby food in your maps app", url: "https://www.google.com/maps/search/food/" }],
    shelter: [{ title: "HUD Find Shelter", url: "https://www.hud.gov/FindShelter" }],
    showers: [{ title: "HUD Find Shelter (shelters often offer showers)", url: "https://www.hud.gov/FindShelter" }],
    clinic: [{ title: "HRSA Find a Health Center (sliding-scale fees)", url: "https://findahealthcenter.hrsa.gov/" }],
    community: [
      { title: "Narcotics Anonymous (meeting search on na.org)", url: "https://www.na.org/" },
      { title: "Alcoholics Anonymous meeting finder", url: "https://www.aa.org/find-aa" },
    ],
    jobs: [{ title: "CareerOneStop American Job Center finder", url: "https://www.careeronestop.org/LocalHelp/AmericanJobCenters/find-american-job-centers.aspx" }],
  }
  return [...(directories[kind] ?? []), { title: "Find local help through 211", url: "https://www.211.org/get-help" }]
}
