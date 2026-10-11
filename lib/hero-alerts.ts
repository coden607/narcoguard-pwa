// Live Hero/community-resource matching primitives.
// Exact coordinates are converted immediately into a coarse ~5 km cell; exact location is never stored here.

export const CELL_DEGREES = 0.05
export const REQUEST_TTL_MS = 30 * 60 * 1000
export const RESOURCE_REQUEST_TTL_MS = 2 * 60 * 60 * 1000
export const MAX_AVAILABILITY_MS = 8 * 60 * 60 * 1000
export const MAX_HEROES_PER_REQUEST = 5

export const HERO_RESOURCE_KINDS = [
  "naloxone",
  "food",
  "water",
  "clothing",
  "hygiene",
  "ride",
  "phone-charging",
  "shelter-help",
  "other",
] as const
export type HeroResourceKind = (typeof HERO_RESOURCE_KINDS)[number]

export const HERO_RESOURCE_LABELS: Record<HeroResourceKind, string> = {
  naloxone: "Naloxone / Narcan",
  food: "Food",
  water: "Water",
  clothing: "Clothing",
  hygiene: "Hygiene supplies",
  ride: "Ride / transportation help",
  "phone-charging": "Phone charging",
  "shelter-help": "Shelter / housing navigation",
  other: "Other practical help",
}

export interface Cell { la: number; lo: number }

export function cellOf(lat: number, lon: number): Cell | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return { la: Math.floor(lat / CELL_DEGREES), lo: Math.floor(lon / CELL_DEGREES) }
}

export const cellKey = (cell: Cell) => `${cell.la}:${cell.lo}`

export function parseCellKey(key: string): Cell | null {
  const match = /^(-?\d{1,5}):(-?\d{1,5})$/.exec(key)
  return match ? { la: Number(match[1]), lo: Number(match[2]) } : null
}

export function cellCenter(key: string) {
  const cell = parseCellKey(key)
  if (!cell) return null
  return {
    lat: (cell.la + 0.5) * CELL_DEGREES,
    lon: (cell.lo + 0.5) * CELL_DEGREES,
  }
}

/** The cell and its eight neighbours, so a Hero just across a cell edge still matches. */
export function nearbyCells(cell: Cell): string[] {
  const keys: string[] = []
  for (let dLa = -1; dLa <= 1; dLa++) {
    for (let dLo = -1; dLo <= 1; dLo++) keys.push(cellKey({ la: cell.la + dLa, lo: cell.lo + dLo }))
  }
  return keys
}

export interface HeroAvailability {
  heroId: string
  cell: string
  availableUntil: number
  paused: boolean
  certificateExpiresAt: number
  emergencyReady: boolean
  naloxoneOnCall: boolean
  resources: HeroResourceKind[]
}

export type HeroRequestKind = "emergency" | "resource"
export interface HeroRequest {
  id: string
  cell: string
  createdAt: number
  expiresAt: number
  kind: HeroRequestKind
  called911: boolean
  resourceKind?: HeroResourceKind
  status?: "open" | "accepted" | "completed" | "cancelled"
}

export type RequestCheck = { ok: true; request: Omit<HeroRequest, "id"> } | { ok: false; error: string }

export function isHeroResourceKind(value: unknown): value is HeroResourceKind {
  return typeof value === "string" && (HERO_RESOURCE_KINDS as readonly string[]).includes(value)
}

export function sanitizeResources(value: unknown): HeroResourceKind[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(isHeroResourceKind))].slice(0, HERO_RESOURCE_KINDS.length)
}

/** Emergency request. Refuses unless 911 has been called, and stores only the coarse cell. */
export function prepareRequest(input: { lat: unknown; lon: unknown; called911: unknown }, now = Date.now()): RequestCheck {
  if (input.called911 !== true) return { ok: false, error: "Call 911 first. Heroes add help while EMS is coming; they never replace 911." }
  const cell = typeof input.lat === "number" && typeof input.lon === "number" ? cellOf(input.lat, input.lon) : null
  if (!cell) return { ok: false, error: "Your location could not be read. Call 911 and give them your address." }
  return {
    ok: true,
    request: {
      cell: cellKey(cell),
      createdAt: now,
      expiresAt: now + REQUEST_TTL_MS,
      kind: "emergency",
      called911: true,
      status: "open",
    },
  }
}

/** Practical-needs request. It does not imply emergency or require 911. */
export function prepareResourceRequest(
  input: { lat: unknown; lon: unknown; resourceKind: unknown },
  now = Date.now(),
): RequestCheck {
  const cell = typeof input.lat === "number" && typeof input.lon === "number" ? cellOf(input.lat, input.lon) : null
  if (!cell) return { ok: false, error: "Your approximate location is needed to find nearby community resources." }
  if (!isHeroResourceKind(input.resourceKind)) return { ok: false, error: "Choose the kind of help you need." }
  return {
    ok: true,
    request: {
      cell: cellKey(cell),
      createdAt: now,
      expiresAt: now + RESOURCE_REQUEST_TTL_MS,
      kind: "resource",
      called911: false,
      resourceKind: input.resourceKind,
      status: "open",
    },
  }
}

/** Opt-in availability, capped at 8 hours. Emergency-ready Heroes must attest they carry naloxone. */
export function prepareAvailability(
  input: {
    heroId: string
    lat: unknown
    lon: unknown
    hours: unknown
    certificateExpiresAt: number
    emergencyReady?: unknown
    naloxoneOnCall?: unknown
    resources?: unknown
  },
  now = Date.now(),
): HeroAvailability | null {
  const cell = typeof input.lat === "number" && typeof input.lon === "number" ? cellOf(input.lat, input.lon) : null
  const hours = typeof input.hours === "number" && Number.isFinite(input.hours) ? input.hours : 0
  const resources = sanitizeResources(input.resources)
  const emergencyReady = input.emergencyReady === true
  const naloxoneOnCall = input.naloxoneOnCall === true
  if (!cell || hours <= 0 || input.certificateExpiresAt <= now) return null
  if (emergencyReady && !naloxoneOnCall) return null
  if (!emergencyReady && resources.length === 0) return null
  return {
    heroId: input.heroId,
    cell: cellKey(cell),
    availableUntil: now + Math.min(hours * 3_600_000, MAX_AVAILABILITY_MS),
    paused: false,
    certificateExpiresAt: input.certificateExpiresAt,
    emergencyReady,
    naloxoneOnCall,
    resources,
  }
}

export const isActive = (hero: HeroAvailability, now = Date.now()) =>
  !hero.paused && hero.availableUntil > now && hero.certificateExpiresAt > now

export function heroCanHelp(hero: HeroAvailability, request: HeroRequest) {
  if (request.kind === "emergency") return hero.emergencyReady && hero.naloxoneOnCall
  return Boolean(request.resourceKind && hero.resources.includes(request.resourceKind))
}

/** Up to five matching Heroes in or next to the request cell. */
export function matchHeroes(request: HeroRequest, heroes: readonly HeroAvailability[], now = Date.now()): HeroAvailability[] {
  if (request.expiresAt <= now || request.status === "cancelled" || request.status === "completed") return []
  const origin = parseCellKey(request.cell)
  if (!origin) return []
  const near = new Set(nearbyCells(origin))
  const distance = (key: string) => {
    const cell = parseCellKey(key)
    return cell ? Math.max(Math.abs(cell.la - origin.la), Math.abs(cell.lo - origin.lo)) : 9
  }
  return heroes
    .filter((hero) => isActive(hero, now) && near.has(hero.cell) && heroCanHelp(hero, request))
    .sort((a, b) => distance(a.cell) - distance(b.cell))
    .slice(0, MAX_HEROES_PER_REQUEST)
}

/** Requests a Hero can see right now. */
export function visibleRequests(hero: HeroAvailability, requests: readonly HeroRequest[], now = Date.now()): HeroRequest[] {
  if (!isActive(hero, now)) return []
  const home = parseCellKey(hero.cell)
  if (!home) return []
  const near = new Set(nearbyCells(home))
  return requests.filter((request) =>
    request.expiresAt > now &&
    (request.status ?? "open") === "open" &&
    near.has(request.cell) &&
    heroCanHelp(hero, request),
  )
}

/** Generic copy: never identifies the requester or implies a diagnosis. */
export function alertText(request: HeroRequest, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - request.createdAt) / 60_000))
  const when = minutes === 0 ? "just now" : `${minutes} min ago`
  if (request.kind === "resource" && request.resourceKind) {
    return `NarcoGuard: someone within about 5 km requested ${HERO_RESOURCE_LABELS[request.resourceKind]} ${when}. Only accept if you can help safely; no exact location or identity is shared automatically.`
  }
  return `NarcoGuard: someone within about 5 km asked for a trained Hero ${when}. 911 has been called. Only go if it is safe, carry naloxone, and follow EMS when they arrive.`
}

export type AlertsStatus = { live: boolean; reason: string }

/** Live only with the explicit switch and every dependency in place. */
export function alertsStatus(env: Record<string, string | undefined>): AlertsStatus {
  if (env.HERO_ALERTS_ENABLED !== "true") return { live: false, reason: "Nearby Hero requests are not live until the network safety/privacy launch switch is enabled." }
  const missing = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "HERO_CERT_SECRET"].filter((name) => !env[name])
  if (missing.length > 0) return { live: false, reason: "Nearby Hero requests are switched on but not fully configured yet." }
  return { live: true, reason: "Nearby Hero and community-resource requests are live." }
}
