import type { NearbyResource } from "./resource-finder"
import { cleanDetails } from "./resource-moderation"
import { validDate } from "./meeting-discovery"

export const ACCESSIBILITY_FIELDS = { entrance: "Step-free entrance", restroom: "Accessible restroom", "quiet-space": "Quiet space", pets: "Pets allowed (ask separately about service animals)" } as const
export const ACCESSIBILITY_VALUES = { yes: "Reported yes", no: "Reported no", limited: "Reported limited", unknown: "Unknown" } as const

// A general wheelchair tag is not evidence about any of these specific facilities.
export function accessibilityDetails(_resource: NearbyResource) {
  void _resource
  return Object.entries(ACCESSIBILITY_FIELDS).map(([field, label]) => ({ field, label, value: "Unknown", source: null }))
}

export function accessibilityReport(input: { field: string; value: string; provenance: string; observedAt: string }) {
  if (!Object.hasOwn(ACCESSIBILITY_FIELDS, input.field) || !Object.hasOwn(ACCESSIBILITY_VALUES, input.value) || !validDate(input.observedAt)) return null
  const provenance = cleanDetails(input.provenance, 700)
  if (!provenance) return null
  const field = input.field as keyof typeof ACCESSIBILITY_FIELDS
  const value = input.value as keyof typeof ACCESSIBILITY_VALUES
  return { reason: "incorrect" as const, details: `Accessibility contribution for review. ${ACCESSIBILITY_FIELDS[field]}: ${ACCESSIBILITY_VALUES[value]}. Observed/contacted: ${input.observedAt}. Provenance: ${provenance}. Not independently verified; do not automatically publish.` }
}
