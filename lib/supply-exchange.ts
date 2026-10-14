import { isValidResourceRef, isModerationRole, cleanDetails } from "./resource-moderation"

/**
 * Supply exchange board (Feature 23).
 *
 * Local, moderated listings for naloxone kits, chargers, hygiene packs, and
 * transit help between users and organizations. Pure validation and a small
 * state machine; persistence lives in Supabase (see migration
 * 20261014110000_supply_exchange_board.sql) behind RLS that enforces the
 * ownership and claim rules server-side.
 *
 * Moderation reuse: a listing is reported through the Feature 15 queue with
 * a source-scoped `supply:<id>` reference. Takedowns run through the
 * moderator path of the listings PATCH route and the report's own audit
 * trail — no parallel queue, no parallel audit log.
 *
 * Location discipline: listings carry a coarse city/neighborhood label
 * only. Raw coordinates are rejected here and by a database check, so the
 * board cannot become a precise-location history.
 */

export const SUPPLY_KINDS = ["naloxone-kit", "charger", "hygiene-pack", "transit-help"] as const
export type SupplyKind = (typeof SUPPLY_KINDS)[number]

export const SUPPLY_CONDITIONS = ["new", "like-new", "used", "unknown"] as const
export type SupplyCondition = (typeof SUPPLY_CONDITIONS)[number]

export const SUPPLY_STATUSES = ["open", "claimed", "closed"] as const
export type SupplyStatus = (typeof SUPPLY_STATUSES)[number]

export const SUPPLY_PROVENANCE = ["individual", "organization"] as const
export type SupplyProvenance = (typeof SUPPLY_PROVENANCE)[number]

export const SUPPLY_QUANTITY_MAX = 20
export const SUPPLY_TITLE_MAX = 120
export const SUPPLY_LOCATION_MAX = 120

export function isSupplyKind(value: unknown): value is SupplyKind {
  return (SUPPLY_KINDS as readonly string[]).includes(value as string)
}

export function isSupplyCondition(value: unknown): value is SupplyCondition {
  return (SUPPLY_CONDITIONS as readonly string[]).includes(value as string)
}

export function isSupplyStatus(value: unknown): value is SupplyStatus {
  return (SUPPLY_STATUSES as readonly string[]).includes(value as string)
}

export function isSupplyProvenance(value: unknown): value is SupplyProvenance {
  return (SUPPLY_PROVENANCE as readonly string[]).includes(value as string)
}

/** Titles are short labels, bounded and control-character free. */
export function cleanTitle(value: unknown, max = SUPPLY_TITLE_MAX): string | null {
  if (typeof value !== "string") return null
  const cleaned = value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim()
  if (cleaned.length < 3 || cleaned.length > max) return null
  return cleaned
}

/** Descriptions reuse the report detail cleaner: bounded, single-line semantics. */
export function cleanDescription(value: unknown): string | null {
  return cleanDetails(value)
}

const COORDINATE_PATTERN = /^[+-]?\d+(\.\d+)?\s*,\s*[+-]?\d+(\.\d+)?$/

/**
 * Coarse location label (city, neighborhood, cross streets are fine as
 * prose). Raw coordinate pairs are rejected in both directions so a listing
 * can never pin a precise point.
 */
export function cleanLocationLabel(value: unknown, max = SUPPLY_LOCATION_MAX): string | null {
  if (typeof value !== "string") return null
  const cleaned = value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim()
  if (cleaned.length < 3 || cleaned.length > max) return null
  if (COORDINATE_PATTERN.test(cleaned)) return null
  return cleaned
}

export function cleanQuantity(value: unknown): number | null {
  const quantity = typeof value === "number" ? value : Number(value)
  if (!Number.isInteger(quantity)) return null
  if (quantity < 1 || quantity > SUPPLY_QUANTITY_MAX) return null
  return quantity
}

/** Source-scoped reference used to report a listing through the moderation queue. */
export function listingRef(listingId: string): string {
  return `supply:${listingId}`
}

export function isListingRef(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("supply:") && isValidResourceRef(value)
}

export type ListingActorRole = "owner" | "claimant" | "member" | "moderator"

export function roleFor(actorId: string, listing: { owner_id: string; claimed_by: string | null }, moderatorIds?: ReadonlySet<string>): ListingActorRole {
  if (moderatorIds?.has(actorId)) return "moderator"
  if (actorId === listing.owner_id) return "owner"
  if (listing.claimed_by !== null && actorId === listing.claimed_by) return "claimant"
  return "member"
}

/**
 * Listing lifecycle. Owners cannot claim their own listing. Closed is
 * terminal. Moderators can close anything (takedown path).
 */
export function canTransitionListing(
  from: SupplyStatus,
  to: SupplyStatus,
  role: ListingActorRole,
): boolean {
  if (from === to) return false
  switch (`${from}->${to}`) {
    case "open->claimed":
      return role === "member"
    case "open->closed":
      return role === "owner" || role === "moderator"
    case "claimed->open":
      return role === "claimant" || role === "owner"
    case "claimed->closed":
      return role === "owner" || role === "claimant" || role === "moderator"
    default:
      return false
  }
}

export interface ListingInput {
  kind: unknown
  title: unknown
  description: unknown
  condition?: unknown
  quantity?: unknown
  locationLabel: unknown
  provenance?: unknown
}

export type ListingValidation =
  | { ok: true; value: { kind: SupplyKind; title: string; description: string; condition: SupplyCondition | null; quantity: number; locationLabel: string; provenance: SupplyProvenance } }
  | { ok: false; errors: string[] }

/** Full input validation for the create route; every failure is named. */
export function validateListingInput(input: ListingInput): ListingValidation {
  const errors: string[] = []
  if (!isSupplyKind(input.kind)) errors.push("kind must be one of naloxone-kit, charger, hygiene-pack, transit-help")
  const title = cleanTitle(input.title)
  if (!title) errors.push(`title must be 3-${SUPPLY_TITLE_MAX} characters`)
  const description = cleanDescription(input.description)
  if (!description) errors.push("description must be 1-2000 characters")
  const quantity = cleanQuantity(input.quantity ?? 1)
  if (quantity === null) errors.push(`quantity must be an integer between 1 and ${SUPPLY_QUANTITY_MAX}`)
  const locationLabel = cleanLocationLabel(input.locationLabel)
  if (!locationLabel) errors.push(`locationLabel must be 3-${SUPPLY_LOCATION_MAX} characters and not raw coordinates`)
  const condition = input.condition === undefined || input.condition === null ? null : input.condition
  if (condition !== null && !isSupplyCondition(condition)) errors.push("condition must be one of new, like-new, used, unknown")
  const provenance = input.provenance ?? "individual"
  if (!isSupplyProvenance(provenance)) errors.push("provenance must be individual or organization")
  if (errors.length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      kind: input.kind as SupplyKind,
      title: title as string,
      description: description as string,
      condition: condition as SupplyCondition | null,
      quantity: quantity as number,
      locationLabel: locationLabel as string,
      provenance: provenance as SupplyProvenance,
    },
  }
}

export { isModerationRole }
