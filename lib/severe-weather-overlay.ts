import type { KnownResource } from "./resource-inventory"
import type { ResourceKind } from "./resource-finder"

/**
 * Severe-weather resource overlay (Feature 24).
 *
 * Layers seasonal warming/cooling centers and shelter windows onto the known
 * resource inventory when a weather alert is active. The caller supplies the
 * alert (this module never calls a weather API) and the ZIP the alert
 * applies to; the overlay returns matching known resources with staleness
 * visible and the standing no-confirmed-availability rule enforced: output
 * text never claims a resource is open, staffed, or has space.
 *
 * Escalation: an active emergency-severity alert with zero known matches
 * produces an escalation carrying caller-supplied fallback contacts (211,
 * 311, 911). Lower severities with zero matches return an honest empty
 * overlay — absence of data is not an emergency by itself.
 */

export const WEATHER_ALERT_KINDS = ["heat", "cold", "storm", "air-quality"] as const
export type WeatherAlertKind = (typeof WEATHER_ALERT_KINDS)[number]

export const WEATHER_SEVERITIES = ["watch", "warning", "emergency"] as const
export type WeatherSeverity = (typeof WEATHER_SEVERITIES)[number]

export interface WeatherAlert {
  kind: WeatherAlertKind
  severity: WeatherSeverity
  /** Display label from the alerting source, e.g. "Excessive Heat Warning". */
  regionLabel: string
  startsAt: string
  endsAt: string
  /** Alerting source name; always surfaced next to the alert. */
  source: string
}

export interface FallbackContact {
  label: string
  phone: string
}

/** Resource kinds that historically serve as seasonal centers, per alert kind. */
export const WEATHER_CENTER_KINDS: Record<WeatherAlertKind, readonly ResourceKind[]> = {
  heat: ["community", "library", "clinic", "emergency", "shelter"],
  cold: ["shelter", "community", "emergency", "clinic", "library"],
  storm: ["shelter", "emergency"],
  "air-quality": ["library", "community", "clinic"],
}

export const WEATHER_OVERLAY_DISCLAIMER =
  "Severe-weather listings are leads from public sources, not confirmations. Hours and capacity may change; contact the site before going."

export function isWeatherAlertKind(value: unknown): value is WeatherAlertKind {
  return (WEATHER_ALERT_KINDS as readonly string[]).includes(value as string)
}

export function isWeatherSeverity(value: unknown): value is WeatherSeverity {
  return (WEATHER_SEVERITIES as readonly string[]).includes(value as string)
}

const validIso = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value))

/** Alerts must be well-formed and cover a positive time window. */
export function isValidWeatherAlert(value: unknown): value is WeatherAlert {
  if (!value || typeof value !== "object") return false
  const alert = value as WeatherAlert
  if (!isWeatherAlertKind(alert.kind) || !isWeatherSeverity(alert.severity)) return false
  if (typeof alert.regionLabel !== "string" || alert.regionLabel.trim().length === 0) return false
  if (typeof alert.source !== "string" || alert.source.trim().length === 0) return false
  if (!validIso(alert.startsAt) || !validIso(alert.endsAt)) return false
  return Date.parse(alert.endsAt) > Date.parse(alert.startsAt)
}

export function isActiveAlert(alert: WeatherAlert, now: string): boolean {
  const at = Date.parse(now)
  return Date.parse(alert.startsAt) <= at && at <= Date.parse(alert.endsAt)
}

export interface WeatherOverlayMatch {
  key: string
  name: string
  kind: ResourceKind
  zip: string
  address?: string
  phone?: string
  /** Copied reference hours, always presented as unverified. */
  hours?: string
  /** Staleness is always visible; the overlay never hides it. */
  lastSeenAt: string
  source: string
}

export interface WeatherEscalation {
  reason: string
  fallbacks: FallbackContact[]
}

export interface WeatherOverlay {
  alert: WeatherAlert
  active: boolean
  zip: string
  disclaimer: string
  matches: WeatherOverlayMatch[]
  escalation: WeatherEscalation | null
}

export interface OverlayOptions {
  zip: string
  now: string
  fallbacks?: readonly FallbackContact[]
  maxMatches?: number
}

/**
 * Build the overlay for one alert over the known resource inventory.
 * Inactive or invalid alerts return an empty inactive overlay. Escalation
 * only fires for active emergency alerts with zero matches.
 */
export function overlayForAlert(alert: WeatherAlert, inventory: readonly KnownResource[], options: OverlayOptions): WeatherOverlay {
  const base: WeatherOverlay = {
    alert,
    active: false,
    zip: options.zip,
    disclaimer: WEATHER_OVERLAY_DISCLAIMER,
    matches: [],
    escalation: null,
  }
  if (!isValidWeatherAlert(alert)) return base
  if (!/^\d{5}$/.test(options.zip)) return base
  const active = isActiveAlert(alert, options.now)
  if (!active) return { ...base, active: false }

  const allowed = new Set(WEATHER_CENTER_KINDS[alert.kind])
  const max = Math.max(1, Math.min(options.maxMatches ?? 20, 50))
  const matches: WeatherOverlayMatch[] = inventory
    .filter((row) => row.zip === options.zip && allowed.has(row.resource.kind))
    .sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt))
    .slice(0, max)
    .map((row) => ({
      key: row.key,
      name: row.resource.name,
      kind: row.resource.kind,
      zip: row.zip,
      ...(row.resource.address ? { address: row.resource.address } : {}),
      ...(row.resource.phone ? { phone: row.resource.phone } : {}),
      ...(row.resource.hours ? { hours: row.resource.hours } : {}),
      lastSeenAt: row.lastSeenAt,
      source: row.resource.source,
    }))

  let escalation: WeatherEscalation | null = null
  if (alert.severity === "emergency" && matches.length === 0) {
    escalation = {
      reason: `${alert.regionLabel}: no known ${alert.kind} centers are listed for this ZIP in local data.`,
      fallbacks: [...(options.fallbacks ?? [])],
    }
  }
  return { alert, active: true, zip: options.zip, disclaimer: WEATHER_OVERLAY_DISCLAIMER, matches, escalation }
}

export interface WeatherWatchProposal {
  kinds: readonly ResourceKind[]
  zip: string
  /** Alert end; watches expire with the alert instead of lingering. */
  until: string
  reason: string
}

/**
 * Propose a short-lived resource watch in the shape the watch framework
 * consumes. Only proposed for active alerts; the caller owns consent.
 */
export function proposeWeatherWatch(alert: WeatherAlert, options: { zip: string; now: string }): WeatherWatchProposal | null {
  if (!isValidWeatherAlert(alert)) return null
  if (!/^\d{5}$/.test(options.zip)) return null
  if (!isActiveAlert(alert, options.now)) return null
  return {
    kinds: WEATHER_CENTER_KINDS[alert.kind],
    zip: options.zip,
    until: alert.endsAt,
    reason: `Severe weather overlay: ${alert.regionLabel} (${alert.source})`,
  }
}
