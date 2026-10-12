import { NEEDS, type CheckIn, type Need } from "./guardian-stability"

export type LearnedEvent =
  | `need:${Need}`
  | "isolated"
  | "low-mood"
  | "strong-craving"
  | "short-sleep"
  | "missed-meal"
  | "return-to-use"

export type TransitionInsight = {
  from: LearnedEvent
  to: LearnedEvent
  observed: number
  comparable: number
  percent: number
}

export type NeuralPatternResult =
  | {
      status: "ready"
      score: number
      labeledDays: number
      positiveDays: number
      negativeDays: number
      note: string
    }
  | {
      status: "insufficient-data"
      labeledDays: number
      positiveDays: number
      negativeDays: number
      note: string
    }

const EVENT_LABELS: Record<LearnedEvent, string> = {
  "need:food": "food was unmet",
  "need:water": "water was unmet",
  "need:sleep": "sleep need was unmet",
  "need:hygiene": "shower / hygiene was unmet",
  "need:laundry": "laundry was unmet",
  "need:safePlace": "safe place was unmet",
  "need:connection": "connection need was unmet",
  "need:treatment": "treatment support was unmet",
  isolated: "isolation was recorded",
  "low-mood": "low mood was recorded",
  "strong-craving": "strong craving was recorded",
  "short-sleep": "less than 5 hours of sleep was recorded",
  "missed-meal": "no meal was logged",
  "return-to-use": "a return-to-use event was voluntarily recorded",
}

export const learnedEventLabel = (event: LearnedEvent) => EVENT_LABELS[event]

function uniqueSorted(entries: readonly CheckIn[]) {
  return [...new Map(entries.map((entry) => [entry.date, entry])).values()].sort((a, b) => a.date.localeCompare(b.date))
}

function knownEvent(entry: CheckIn, event: LearnedEvent): boolean | undefined {
  if (event.startsWith("need:")) {
    const need = event.slice(5) as Need
    const value = entry.needs[need]
    return value === undefined ? undefined : value === "needs-help"
  }
  if (event === "isolated") return entry.isolated
  if (event === "low-mood") return entry.mood === undefined ? undefined : entry.mood === "low"
  if (event === "strong-craving") return entry.craving === undefined ? undefined : entry.craving === "strong"
  if (event === "short-sleep") return entry.sleepHours === undefined ? undefined : entry.sleepHours < 5
  if (event === "missed-meal") return entry.meals === undefined ? undefined : entry.meals.length === 0
  if (event === "return-to-use") return entry.returnToUse
  return undefined
}

export const LEARNED_EVENTS: readonly LearnedEvent[] = [
  ...NEEDS.map((need) => `need:${need}` as LearnedEvent),
  "isolated",
  "low-mood",
  "strong-craving",
  "short-sleep",
  "missed-meal",
  "return-to-use",
]

/**
 * Learns only descriptive next-check-in transitions from the person's own history.
 * Unknown answers are excluded from denominators.
 */
export function transitionInsights(entries: readonly CheckIn[], minComparable = 5): TransitionInsight[] {
  const ordered = uniqueSorted(entries)
  const out: TransitionInsight[] = []
  for (const from of LEARNED_EVENTS) {
    for (const to of LEARNED_EVENTS) {
      if (from === to) continue
      let comparable = 0
      let observed = 0
      for (let index = 0; index < ordered.length - 1; index++) {
        const a = knownEvent(ordered[index], from)
        const b = knownEvent(ordered[index + 1], to)
        if (a !== true || b === undefined) continue
        comparable++
        if (b === true) observed++
      }
      if (comparable >= minComparable) {
        out.push({ from, to, observed, comparable, percent: Math.round(100 * observed / comparable) })
      }
    }
  }
  return out.sort((a, b) => b.percent - a.percent || b.comparable - a.comparable)
}

export function findTransition(entries: readonly CheckIn[], from: LearnedEvent, to: LearnedEvent, minComparable = 5) {
  return transitionInsights(entries, minComparable).find((row) => row.from === from && row.to === to) ?? null
}

const FEATURES = 14
const HIDDEN = 6
const MIN_LABELED_DAYS = 30
const MIN_POSITIVE = 5
const MIN_NEGATIVE = 10

function featureVector(entry: CheckIn): number[] {
  const values: number[] = []
  for (const need of NEEDS) {
    const value = entry.needs[need]
    values.push(value === "needs-help" ? 1 : 0)
  }
  values.push(entry.isolated === true ? 1 : 0)
  values.push(entry.mood === "low" ? 1 : 0)
  values.push(entry.craving === "strong" ? 1 : 0)
  values.push(typeof entry.sleepHours === "number" && entry.sleepHours < 5 ? 1 : 0)
  values.push(Array.isArray(entry.meals) && entry.meals.length === 0 ? 1 : 0)
  values.push(entry.craving === "some" ? 1 : 0)
  return values.slice(0, FEATURES)
}

const sigmoid = (value: number) => 1 / (1 + Math.exp(-Math.max(-20, Math.min(20, value))))
const tanh = (value: number) => Math.tanh(Math.max(-10, Math.min(10, value)))

function seeded(index: number) {
  const x = Math.sin((index + 1) * 12.9898) * 43758.5453
  return (x - Math.floor(x) - 0.5) * 0.18
}

/**
 * Tiny dependency-free one-hidden-layer network, trained entirely in memory on voluntary local data.
 * Its output is deliberately called a pattern score, not a calibrated relapse probability.
 */
export function neuralPatternScore(entries: readonly CheckIn[], today: CheckIn): NeuralPatternResult {
  const labeled = uniqueSorted(entries).filter((entry) => typeof entry.returnToUse === "boolean")
  const positiveDays = labeled.filter((entry) => entry.returnToUse === true).length
  const negativeDays = labeled.length - positiveDays
  if (labeled.length < MIN_LABELED_DAYS || positiveDays < MIN_POSITIVE || negativeDays < MIN_NEGATIVE) {
    return {
      status: "insufficient-data",
      labeledDays: labeled.length,
      positiveDays,
      negativeDays,
      note: `Need at least ${MIN_LABELED_DAYS} labeled days, including ${MIN_POSITIVE} return-to-use and ${MIN_NEGATIVE} no-return-to-use days, before the experimental neural layer will score anything.`,
    }
  }

  const w1 = Array.from({ length: HIDDEN }, (_, h) => Array.from({ length: FEATURES }, (_, i) => seeded(h * FEATURES + i)))
  const b1 = Array.from({ length: HIDDEN }, (_, h) => seeded(200 + h))
  const w2 = Array.from({ length: HIDDEN }, (_, h) => seeded(300 + h))
  let b2 = seeded(400)
  const learningRate = 0.035

  for (let epoch = 0; epoch < 180; epoch++) {
    for (const entry of labeled) {
      const x = featureVector(entry)
      const hidden = w1.map((row, h) => tanh(row.reduce((sum, weight, i) => sum + weight * x[i], b1[h])))
      const output = sigmoid(hidden.reduce((sum, value, h) => sum + value * w2[h], b2))
      const target = entry.returnToUse === true ? 1 : 0
      const delta2 = output - target
      const priorW2 = [...w2]
      for (let h = 0; h < HIDDEN; h++) w2[h] -= learningRate * delta2 * hidden[h]
      b2 -= learningRate * delta2
      for (let h = 0; h < HIDDEN; h++) {
        const delta1 = delta2 * priorW2[h] * (1 - hidden[h] * hidden[h])
        for (let i = 0; i < FEATURES; i++) w1[h][i] -= learningRate * delta1 * x[i]
        b1[h] -= learningRate * delta1
      }
    }
  }

  const x = featureVector(today)
  const hidden = w1.map((row, h) => tanh(row.reduce((sum, weight, i) => sum + weight * x[i], b1[h])))
  const output = sigmoid(hidden.reduce((sum, value, h) => sum + value * w2[h], b2))
  return {
    status: "ready",
    score: Math.round(output * 100),
    labeledDays: labeled.length,
    positiveDays,
    negativeDays,
    note: "Experimental personal pattern score only. It is not a calibrated probability, diagnosis, or prediction of relapse and should not trigger outside contact automatically.",
  }
}
