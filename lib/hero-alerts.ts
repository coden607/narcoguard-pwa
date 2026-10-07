// Nearby Hero requests: design and logic, built but switched off. They go live only when
// HERO_ALERTS_ENABLED is "true" AND accounts, the service role and Hero certificates are configured,
// and that switch must not be turned on before a separate safety and privacy review approves it.
//
// Rules this module enforces:
// - A request is only accepted after the person confirms 911 has been called (or is being called);
//   Heroes add help while EMS comes and never replace 911.
// - Locations are coarse: a grid cell about 5 km across. No exact location, name or health detail
//   is stored or shown, and alert text never reveals anyone's recovery status.
// - Heroes opt in for a limited time (max 8 hours), can pause or leave at any time, and only
//   currently certified Heroes are matched.
// - Heroes see requests by checking the app (pull); NarcoGuard sends no texts or calls.

export const CELL_DEGREES = 0.05 // about 5.5 km north–south
export const REQUEST_TTL_MS = 30 * 60 * 1000
export const MAX_AVAILABILITY_MS = 8 * 60 * 60 * 1000
export const MAX_HEROES_PER_REQUEST = 5

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

/** The cell and its eight neighbours, so a Hero just across a cell edge still sees the request. */
export function nearbyCells(cell: Cell): string[] {
  const keys: string[] = []
  for (let dLa = -1; dLa <= 1; dLa++) for (let dLo = -1; dLo <= 1; dLo++) keys.push(cellKey({ la: cell.la + dLa, lo: cell.lo + dLo }))
  return keys
}

export interface HeroAvailability {
  heroId: string
  cell: string
  availableUntil: number
  paused: boolean
  certificateExpiresAt: number
}

export interface HeroRequest {
  id: string
  cell: string
  createdAt: number
  expiresAt: number
  called911: true
}

export type RequestCheck = { ok: true; request: Omit<HeroRequest, "id"> } | { ok: false; error: string }

/** Validates a new request. Refuses unless 911 has been called, and stores only the coarse cell. */
export function prepareRequest(input: { lat: unknown; lon: unknown; called911: unknown }, now = Date.now()): RequestCheck {
  if (input.called911 !== true) return { ok: false, error: "Call 911 first. Heroes add help while EMS is coming; they never replace 911." }
  const cell = typeof input.lat === "number" && typeof input.lon === "number" ? cellOf(input.lat, input.lon) : null
  if (!cell) return { ok: false, error: "Your location could not be read. Call 911 and give them your address." }
  return { ok: true, request: { cell: cellKey(cell), createdAt: now, expiresAt: now + REQUEST_TTL_MS, called911: true } }
}

/** Opt-in availability, capped at 8 hours. */
export function prepareAvailability(input: { heroId: string; lat: unknown; lon: unknown; hours: unknown; certificateExpiresAt: number }, now = Date.now()): HeroAvailability | null {
  const cell = typeof input.lat === "number" && typeof input.lon === "number" ? cellOf(input.lat, input.lon) : null
  const hours = typeof input.hours === "number" && Number.isFinite(input.hours) ? input.hours : 0
  if (!cell || hours <= 0 || input.certificateExpiresAt <= now) return null
  return { heroId: input.heroId, cell: cellKey(cell), availableUntil: now + Math.min(hours * 3_600_000, MAX_AVAILABILITY_MS), paused: false, certificateExpiresAt: input.certificateExpiresAt }
}

export const isActive = (hero: HeroAvailability, now = Date.now()) => !hero.paused && hero.availableUntil > now && hero.certificateExpiresAt > now

/** Up to five available, certified Heroes in or next to the request's cell, closest cell first. */
export function matchHeroes(request: HeroRequest, heroes: readonly HeroAvailability[], now = Date.now()): HeroAvailability[] {
  if (request.expiresAt <= now) return []
  const origin = parseCellKey(request.cell)
  if (!origin) return []
  const near = new Set(nearbyCells(origin))
  const distance = (key: string) => {
    const cell = parseCellKey(key)
    return cell ? Math.max(Math.abs(cell.la - origin.la), Math.abs(cell.lo - origin.lo)) : 9
  }
  return heroes
    .filter((hero) => isActive(hero, now) && near.has(hero.cell))
    .sort((a, b) => distance(a.cell) - distance(b.cell))
    .slice(0, MAX_HEROES_PER_REQUEST)
}

/** Requests a Hero can see right now: open, unexpired and within their nearby cells. */
export function visibleRequests(hero: HeroAvailability, requests: readonly HeroRequest[], now = Date.now()): HeroRequest[] {
  if (!isActive(hero, now)) return []
  const home = parseCellKey(hero.cell)
  if (!home) return []
  const near = new Set(nearbyCells(home))
  return requests.filter((request) => request.expiresAt > now && near.has(request.cell))
}

/** What a Hero is shown. Generic on purpose: nothing about who asked, why, or their recovery. */
export function alertText(request: HeroRequest, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - request.createdAt) / 60_000))
  return `NarcoGuard: someone within about 5 km asked for a trained Hero ${minutes === 0 ? "just now" : `${minutes} min ago`}. 911 has been called. Only go if it is safe, bring naloxone if you have it, and follow EMS when they arrive.`
}

export type AlertsStatus = { live: boolean; reason: string }

/** Live only with the explicit switch and every dependency in place. */
export function alertsStatus(env: Record<string, string | undefined>): AlertsStatus {
  if (env.HERO_ALERTS_ENABLED !== "true") return { live: false, reason: "Nearby Hero requests are not live. They need a separate safety and privacy review before they can be switched on." }
  const missing = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "HERO_CERT_SECRET"].filter((name) => !env[name])
  if (missing.length > 0) return { live: false, reason: "Nearby Hero requests are switched on but not fully configured yet." }
  return { live: true, reason: "Nearby Hero requests are live." }
}
