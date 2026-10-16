import type { Need } from "./guardian-stability"
import type { HeroResourceKind } from "./hero-alerts"

const MAP: Partial<Record<Need, readonly HeroResourceKind[]>> = {
  food: ["food"],
  water: ["water"],
  hygiene: ["shower", "hygiene"],
  safePlace: ["shelter-help"],
}

export function heroWatchKindsForNeeds(needs: readonly Need[]): HeroResourceKind[] {
  return [...new Set(needs.flatMap((need) => MAP[need] ?? []))]
}

export function unwatchablePredictedNeeds(needs: readonly Need[]): Need[] {
  return needs.filter((need) => !(need in MAP))
}
