// Turns what a person says they need ("I'm hungry and have nowhere to sleep") into resource kinds,
// ordered by Maslow level so basic needs are listed first. Runs on the device: the words are not
// sent anywhere unless the person separately chooses AI matching. Ordering is a display aid only;
// every resource stays available, and nothing is withheld based on what was or wasn't matched.

import { NEED_LEVELS, RESOURCE_KINDS, type ResourceKind } from "@/lib/resource-finder"

const PATTERNS: Record<ResourceKind, RegExp> = {
  food: /\b(hungry|starving|food|eat(ing)?|meals?|groceries|grocery|pantry|soup kitchen|food bank|snap|ebt)\b/,
  "quick-meal": /\b(quick meal|fast food|coffee|cafe|breakfast|snack|convenience store|supermarket|mcdonalds|mcdonald's)\b/,
  shelter: /\b(shelter|homeless|nowhere to (sleep|stay|go)|place to (sleep|stay)|sleep(ing)? (outside|rough|in my car)|evicted|bed for (the )?night|housing|roof)\b/,
  water: /\b(water|thirsty|dehydrated|drink(ing)? fountain)\b/,
  toilets: /\b(toilets?|bathroom|restroom|washroom|pee|poop)\b/,
  showers: /\b(showers?|bathe|wash up|hygiene|clean up)\b/,
  laundry: /\b(laundry|laundromat|wash(ing)? (my )?clothes|clean clothes)\b/,
  emergency: /\b(emergency room|er|hospital|bleeding|chest pain|broken bone|serious(ly)? (hurt|injured)|can't breathe)\b/,
  clinic: /\b(clinic|doctor|nurse|sick|ill|medical|check-?up|wound|infection|health care|healthcare)\b/,
  pharmacy: /\b(pharmacy|prescription|meds|medication|medicine|narcan|naloxone|refill)\b/,
  treatment: /\b(treatment|rehab|detox|recovery|sober|sobriety|methadone|suboxone|buprenorphine|counsel(ing|or)|withdrawal|addiction|using again|relapse|mental health)\b/,
  community: /\b(lonely|alone|someone to talk to|support group|meeting|na meeting|aa meeting|community|friends?|peer support)\b/,
  library: /\b(library|internet|wi-?fi|computer|charge my phone|charging|study|read)\b/,
  jobs: /\b(job|jobs|work|employment|hiring|resume|income|money|career)\b/,
}

export const MASLOW_KIND_ORDER: ResourceKind[] = NEED_LEVELS.flatMap((level) => level.kinds as readonly ResourceKind[])

/** Kinds in Maslow display order, without duplicates and limited to known kinds. */
export function orderByMaslow(kinds: Iterable<string>): ResourceKind[] {
  const wanted = new Set(kinds)
  return MASLOW_KIND_ORDER.filter((kind) => wanted.has(kind))
}

/** Matches stated needs on the device. Returns [] when nothing is recognized. */
export function matchNeeds(text: string): ResourceKind[] {
  const normalized = text.toLowerCase().replace(/[’']/g, "'").slice(0, 1000)
  if (!normalized.trim()) return []
  return orderByMaslow(RESOURCE_KINDS.filter((kind) => PATTERNS[kind].test(normalized)))
}

/** Quick-pick buttons: plain words people use, each mapping to one or more kinds. */
export const QUICK_NEEDS: { label: string; kinds: ResourceKind[] }[] = [
  { label: "Food", kinds: ["food"] },
  { label: "Quick meal or coffee", kinds: ["quick-meal"] },
  { label: "A place to sleep", kinds: ["shelter"] },
  { label: "Water", kinds: ["water"] },
  { label: "Bathroom or shower", kinds: ["toilets", "showers"] },
  { label: "Laundry", kinds: ["laundry"] },
  { label: "Medical care", kinds: ["clinic", "pharmacy"] },
  { label: "Treatment or detox", kinds: ["treatment"] },
  { label: "Someone to talk to", kinds: ["community"] },
  { label: "Internet or phone charging", kinds: ["library"] },
  { label: "Work", kinds: ["jobs"] },
]

/** Validates AI output: only known kinds survive, in Maslow order. */
export function parseKindList(value: unknown): ResourceKind[] {
  const list = Array.isArray(value) ? value : Array.isArray((value as { kinds?: unknown } | null)?.kinds) ? (value as { kinds: unknown[] }).kinds : []
  return orderByMaslow(list.filter((item): item is string => typeof item === "string"))
}
