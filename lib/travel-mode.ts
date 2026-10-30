/**
 * Travel-mode resource planning (Feature 27).
 *
 * Temporarily points resource lookup at a destination ZIP, with an
 * automatic, unavoidable return home. Hard boundaries:
 *
 * - The switch is explicit, visible, and always expires on its own.
 *   Expired travel never silently persists: every reader goes through
 *   `effectiveZip`, which falls back to home the moment the window ends.
 * - Duration is bounded (15 minutes to 14 days, default 24h). Extension
 *   is capped at 14 days from the original activation.
 * - ZIP strings only. No coordinates of any kind enter this module.
 * - Deactivation deletes the record, including the remembered home ZIP.
 */

export const TRAVEL_MODE_KEY = "narcoguard_travel_mode_v1"
export const TRAVEL_MIN_MINUTES = 15
export const TRAVEL_MAX_MINUTES = 14 * 24 * 60
export const TRAVEL_DEFAULT_MINUTES = 24 * 60

export interface TravelState {
  version: 1
  active: boolean
  destinationZip: string
  /** Home base captured at activation; deleted together with the record. */
  homeZip: string
  startedAt: string
  expiresAt: string
}

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export const isValidZip = (value: unknown): value is string => typeof value === "string" && /^\d{5}$/.test(value)

const MIN_MS = 60 * 1000

export function readTravel(storage: StorageLike): TravelState | null {
  try {
    const raw = storage.getItem(TRAVEL_MODE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TravelState>
    if (parsed?.version !== 1 || parsed.active !== true) return null
    if (!isValidZip(parsed.destinationZip) || !isValidZip(parsed.homeZip)) return null
    if (typeof parsed.startedAt !== "string" || typeof parsed.expiresAt !== "string") return null
    if (Number.isNaN(Date.parse(parsed.startedAt)) || Number.isNaN(Date.parse(parsed.expiresAt))) return null
    return {
      version: 1,
      active: true,
      destinationZip: parsed.destinationZip,
      homeZip: parsed.homeZip,
      startedAt: parsed.startedAt,
      expiresAt: parsed.expiresAt,
    }
  } catch {
    return null
  }
}

function writeTravel(storage: StorageLike, state: TravelState | null): void {
  if (state === null) storage.setItem(TRAVEL_MODE_KEY, "")
  else storage.setItem(TRAVEL_MODE_KEY, JSON.stringify(state))
}

export function isTravelExpired(state: TravelState | null, now: string): boolean {
  if (!state || !state.active) return true
  return Date.parse(now) >= Date.parse(state.expiresAt)
}

export type ActivateResult = { ok: true; state: TravelState } | { ok: false; error: string }

/**
 * Explicit activation. Replaces any existing travel window. The duration
 * defaults to 24h and is clamped to [15min, 14d].
 */
export function activateTravel(
  storage: StorageLike,
  options: { destinationZip: unknown; homeZip: unknown; durationMinutes?: unknown; now?: string },
): ActivateResult {
  const now = typeof options.now === "string" && !Number.isNaN(Date.parse(options.now)) ? options.now : new Date().toISOString()
  if (!isValidZip(options.destinationZip)) return { ok: false, error: "destinationZip must be a 5-digit ZIP." }
  if (!isValidZip(options.homeZip)) return { ok: false, error: "homeZip must be a 5-digit ZIP." }
  if (options.destinationZip === options.homeZip) return { ok: false, error: "destination and home ZIP must differ." }
  if (typeof options.durationMinutes === "number" && !Number.isFinite(options.durationMinutes)) return { ok: false, error: "durationMinutes must be finite." }
  const rawMinutes = typeof options.durationMinutes === "number" ? Math.round(options.durationMinutes) : TRAVEL_DEFAULT_MINUTES
  const minutes = Math.min(TRAVEL_MAX_MINUTES, Math.max(TRAVEL_MIN_MINUTES, rawMinutes))
  const startedMs = Date.parse(now)
  const state: TravelState = {
    version: 1,
    active: true,
    destinationZip: options.destinationZip,
    homeZip: options.homeZip,
    startedAt: now,
    expiresAt: new Date(startedMs + minutes * MIN_MS).toISOString(),
  }
  try {
    writeTravel(storage, state)
  } catch {
    return { ok: false, error: "Travel mode could not be saved on this device. Storage is full or blocked; free space or allow storage, then try again." }
  }
  return { ok: true, state }
}

/** Explicit deactivation; the record (including home ZIP) is deleted. */
export function deactivateTravel(storage: StorageLike): boolean {
  try {
    if (readTravel(storage) === null) return false
    writeTravel(storage, null)
    storage.setItem(TRAVEL_MODE_KEY, "")
    return true
  } catch {
    // Blocked/full storage must not crash the toggle; the UI still turns off.
    return false
  }
}

export type ExtendResult = { ok: true; state: TravelState } | { ok: false; error: string }

/**
 * Extend the current window by `additionalMinutes`, capped so total span
 * from the original start never exceeds 14 days.
 */
export function extendTravel(storage: StorageLike, additionalMinutes: number, now: string): ExtendResult {
  const state = readTravel(storage)
  if (!state) return { ok: false, error: "no active travel window." }
  if (isTravelExpired(state, now)) return { ok: false, error: "travel window has already expired." }
  if (!Number.isFinite(additionalMinutes) || additionalMinutes <= 0) return { ok: false, error: "additionalMinutes must be a positive number." }
  const startedMs = Date.parse(state.startedAt)
  const currentExpiry = Date.parse(state.expiresAt)
  const requested = currentExpiry + Math.round(additionalMinutes) * MIN_MS
  const capped = Math.min(startedMs + TRAVEL_MAX_MINUTES * MIN_MS, requested)
  const next = { ...state, expiresAt: new Date(capped).toISOString() }
  writeTravel(storage, next)
  return { ok: true, state: next }
}

/**
 * The single source of truth for "which ZIP do lookups use right now".
 * Expired windows return home automatically — callers cannot accidentally
 * keep ranking for a destination after the window closes.
 */
export function effectiveZip(state: TravelState | null, now: string): { zip: string; inTravel: boolean } {
  if (state && !isTravelExpired(state, now)) return { zip: state.destinationZip, inTravel: true }
  return { zip: state?.homeZip ?? "", inTravel: false }
}

/** Order resources destination-first, preserving input order within groups. */
export function rankForTravel<T extends { zip: string }>(items: readonly T[], state: TravelState | null, now: string): T[] {
  const { zip, inTravel } = effectiveZip(state, now)
  if (!inTravel) return [...items]
  return [...items].sort((a, b) => Number(b.zip === zip) - Number(a.zip === zip))
}

/** UI surface: what the banner should say. Null when no active window. */
export function travelBanner(state: TravelState | null, now: string): { destinationZip: string; expiresAt: string; remainingMinutes: number } | null {
  if (!state || isTravelExpired(state, now)) return null
  return {
    destinationZip: state.destinationZip,
    expiresAt: state.expiresAt,
    remainingMinutes: Math.max(0, Math.ceil((Date.parse(state.expiresAt) - Date.parse(now)) / MIN_MS)),
  }
}
