import type { Need } from "./guardian-stability"
import type { ResourceKind } from "./resource-finder"

// The one Maslow taxonomy used by the Guardian planner, /about and the first-run introduction. A planning aid
// only: every kind of help stays available at every level. Treatment sits with recovery and connection, as in
// Find Help's NEED_LEVELS (lib/resource-finder.ts), which merges levels 4 and 5 into "Growth and goals".
export const MASLOW_LEVELS = [
  {
    id: "physiological",
    title: "Body and basic needs",
    description: "Food, water, rest, shelter, toilets, hygiene and laundry.",
    covers: "Food, water, a place to sleep, toilets, showers and laundry.",
    kinds: ["food", "quick-meal", "water", "shelter", "toilets", "showers", "laundry"],
    links: [{ href: "/help", label: "Find Help: search your needs nearby" }, { href: "/stability", label: "Guardian planner: daily needs check-in" }],
  },
  {
    id: "safety",
    title: "Safety and health",
    description: "Medical care, pharmacies and emergency rooms.",
    covers: "Overdose response, naloxone, clinics, pharmacies and emergency rooms.",
    kinds: ["emergency", "clinic", "pharmacy"],
    links: [{ href: "/", label: "Dashboard: emergency steps and 911" }, { href: "/ar", label: "Training: overdose and CPR guides" }, { href: "/help", label: "Find Help: clinics, pharmacies, emergency rooms" }],
  },
  {
    id: "belonging",
    title: "Recovery and connection",
    description: "Treatment, community and recovery-support connections.",
    covers: "Treatment, someone to talk to, peer support, community spaces and people you trust.",
    kinds: ["treatment", "community"],
    links: [{ href: "/help", label: "Find Help: treatment and community" }, { href: "/angel", label: "Angel AI: talk it through" }, { href: "/contacts", label: "Emergency contacts you choose" }, { href: "/hero-signup", label: "Hero Network: train to help others" }],
  },
  {
    id: "esteem",
    title: "Stability and independence",
    description: "Employment help and places with free internet or computers.",
    covers: "Work, income, internet and phone charging, and skills you can be proud of.",
    kinds: ["jobs", "library"],
    links: [{ href: "/help", label: "Find Help: job help and libraries" }, { href: "/hero-signup", label: "Hero certification" }],
  },
  {
    id: "growth",
    title: "Growth and your own goals",
    description: "Learning, planning and community spaces that can support user-chosen goals.",
    covers: "The goals you choose, broken into small steps you can take tomorrow.",
    kinds: ["library", "community"],
    links: [{ href: "/stability", label: "Guardian planner: goals and tomorrow's task" }, { href: "/angel", label: "Angel AI: turn a goal into steps" }, { href: "/constitution", label: "Help shape NarcoGuard" }],
  },
] as const satisfies readonly { id: string; title: string; description: string; covers: string; kinds: readonly ResourceKind[]; links: readonly { href: string; label: string }[] }[]

export const NEED_RESOURCE_KINDS: Record<Need, readonly ResourceKind[]> = {
  food: ["food", "quick-meal"],
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
