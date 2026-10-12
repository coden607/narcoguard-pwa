import type { CheckIn, Need, PlanItem } from "./guardian-stability"

export type InterventionOutcomeInsight = {
  need: Need
  title: string
  followedByMet: number
  comparable: number
  percent: number
}

function orderedUnique(entries: readonly CheckIn[]) {
  return [...new Map(entries.map((entry) => [entry.date, entry])).values()]
    .sort((a, b) => a.date.localeCompare(b.date))
}

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase()
}

/**
 * Describes what happened after completed, need-tagged plan steps the user chose.
 * Unknown next answers are excluded from denominators. This is not causal inference.
 */
export function interventionOutcomeInsights(
  entries: readonly CheckIn[],
  plan: readonly PlanItem[],
  minComparable = 3,
): InterventionOutcomeInsight[] {
  const ordered = orderedUnique(entries)
  const groups = new Map<string, {
    need: Need
    title: string
    followedByMet: number
    comparable: number
  }>()

  for (const item of plan) {
    if (!item.done || !item.need || !item.title.trim()) continue
    const next = ordered.find((entry) =>
      entry.date > item.date && entry.needs[item.need!] !== undefined
    )
    if (!next) continue

    const key = `${item.need}:${normalizeTitle(item.title)}`
    const group = groups.get(key) ?? {
      need: item.need,
      title: item.title.trim(),
      followedByMet: 0,
      comparable: 0,
    }
    group.comparable++
    if (next.needs[item.need] === "met") group.followedByMet++
    groups.set(key, group)
  }

  return [...groups.values()]
    .filter((row) => row.comparable >= minComparable)
    .map((row) => ({
      ...row,
      percent: Math.round(100 * row.followedByMet / row.comparable),
    }))
    .sort((a, b) =>
      b.percent - a.percent ||
      b.comparable - a.comparable ||
      a.title.localeCompare(b.title)
    )
}
