import type { Need } from "./guardian-stability"
import type { ResourceKind } from "./resource-finder"

export const MASLOW_LEVELS = [
  { id: "physiological", title: "Physiological essentials", description: "Food, water, rest, shelter, toilets, hygiene and laundry.", kinds: ["food", "water", "shelter", "toilets", "showers", "laundry"] },
  { id: "safety", title: "Safety and health", description: "Medical care, pharmacies and treatment support.", kinds: ["emergency", "clinic", "pharmacy", "treatment"] },
  { id: "belonging", title: "Connection and belonging", description: "Community and recovery-support connections.", kinds: ["community"] },
  { id: "esteem", title: "Stability and independence", description: "Employment help and places with free internet or computers.", kinds: ["jobs", "library"] },
  { id: "growth", title: "Growth and goals", description: "Learning, planning and community spaces that can support user-chosen goals.", kinds: ["library", "community"] },
] as const satisfies readonly { id: string; title: string; description: string; kinds: readonly ResourceKind[] }[]

export const NEED_RESOURCE_KINDS: Record<Need, readonly ResourceKind[]> = {
  food: ["food"],
  water: ["water"],
  sleep: ["shelter"],
  hygiene: ["showers", "toilets"],
  laundry: ["laundry"],
  safePlace: ["shelter"],
  connection: ["community"],
  treatment: ["treatment", "clinic", "pharmacy"],
}

export function resourceKindsForNeeds(needs: readonly Need[]): ResourceKind[] {
  const selected = new Set<ResourceKind>()
  for (const need of needs) for (const kind of NEED_RESOURCE_KINDS[need]) selected.add(kind)
  const ordered = MASLOW_LEVELS.flatMap((level) => level.kinds)
  return [...new Set(ordered)].filter((kind) => selected.has(kind))
}
