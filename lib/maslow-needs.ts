import type { Need } from "./guardian-stability"
import { NEED_LEVELS, type ResourceKind } from "./resource-finder"

/**
 * Guardian check-in needs mapped onto Maslow's hierarchy as a search organizer.
 * A person can need any level first. This does not rank people or predict relapse.
 */
export const NEED_TO_KINDS: Record<Need, readonly ResourceKind[]> = {
  food: ["food"],
  water: ["water"],
  sleep: ["shelter", "clinic"],
  hygiene: ["showers", "toilets"],
  laundry: ["laundry"],
  safePlace: ["shelter", "emergency"],
  connection: ["community", "treatment"],
  treatment: ["treatment", "pharmacy", "clinic"],
}

export function kindsForNeeds(needs: readonly Need[]): ResourceKind[] {
  const seen = new Set<ResourceKind>()
  const kinds: ResourceKind[] = []
  for (const need of needs) {
    for (const kind of NEED_TO_KINDS[need]) {
      if (seen.has(kind)) continue
      seen.add(kind)
      kinds.push(kind)
    }
  }
  return kinds
}

/** Maslow levels that contain at least one requested kind, with unrelated kinds removed. */
export function levelsForKinds(kinds: readonly ResourceKind[]) {
  const wanted = new Set(kinds)
  return NEED_LEVELS.flatMap((level) => {
    const matched = level.kinds.filter((kind) => wanted.has(kind))
    return matched.length ? [{ ...level, kinds: matched }] : []
  })
}
