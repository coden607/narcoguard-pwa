import {
  HERO_RESOURCE_LABELS,
  cellKey,
  cellOf,
  type HeroResourceKind,
} from "@/lib/hero-alerts"

export const PRACTICAL_HELP_KINDS = [
  "food",
  "water",
  "shower",
  "clothing",
  "hygiene",
  "ride",
  "phone-charging",
  "shelter-help",
  "other",
] as const

export type PracticalHelpKind = (typeof PRACTICAL_HELP_KINDS)[number]
export const PRACTICAL_HELP_LABELS: Record<PracticalHelpKind, string> = Object.fromEntries(
  PRACTICAL_HELP_KINDS.map((kind) => [kind, HERO_RESOURCE_LABELS[kind]]),
) as Record<PracticalHelpKind, string>

export const MAX_PRACTICAL_OFFER_MS = 12 * 60 * 60 * 1000

export interface PracticalHelpOffer {
  helperId: string
  cell: string
  availableUntil: number
  resources: PracticalHelpKind[]
}

export function isPracticalHelpKind(value: unknown): value is PracticalHelpKind {
  return typeof value === "string" && (PRACTICAL_HELP_KINDS as readonly string[]).includes(value)
}

export function sanitizePracticalHelpKinds(value: unknown): PracticalHelpKind[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter(isPracticalHelpKind))].slice(0, PRACTICAL_HELP_KINDS.length)
}

export function preparePracticalHelpOffer(
  input: {
    helperId: string
    lat: unknown
    lon: unknown
    hours: unknown
    resources: unknown
  },
  now = Date.now(),
): PracticalHelpOffer | null {
  const cell = typeof input.lat === "number" && typeof input.lon === "number"
    ? cellOf(input.lat, input.lon)
    : null
  const hours = typeof input.hours === "number" && Number.isFinite(input.hours)
    ? input.hours
    : 0
  const resources = sanitizePracticalHelpKinds(input.resources)

  if (!input.helperId || !cell || hours <= 0 || resources.length === 0) return null

  return {
    helperId: input.helperId,
    cell: cellKey(cell),
    availableUntil: now + Math.min(hours * 3_600_000, MAX_PRACTICAL_OFFER_MS),
    resources,
  }
}

export function practicalOfferActive(offer: PracticalHelpOffer, now = Date.now()) {
  return offer.availableUntil > now && offer.resources.length > 0
}

export function practicalHelpKindsAsHeroResources(
  resources: readonly PracticalHelpKind[],
): HeroResourceKind[] {
  return [...resources]
}
