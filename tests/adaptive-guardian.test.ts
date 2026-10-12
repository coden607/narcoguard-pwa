import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  findTransition,
  learnedNeedSuggestions,
  neuralPatternScore,
  neuralNeedForecasts,
  neuralNeedHorizonForecasts,
  transitionChains,
  transitionInsights,
} from "../lib/adaptive-guardian"
import type { CheckIn } from "../lib/guardian-stability"

const d = (day: number) => `2026-10-${String(day).padStart(2, "0")}`

test("transition learner uses next recorded check-ins and excludes unknown outcomes", () => {
  const entries: CheckIn[] = [
    { date: d(1), needs: { food: "needs-help" } },
    { date: d(2), needs: { food: "met", connection: "needs-help" }, isolated: true },
    { date: d(3), needs: { food: "needs-help" } },
    { date: d(4), needs: { connection: "needs-help" }, isolated: true },
    { date: d(5), needs: { food: "needs-help" } },
    { date: d(6), needs: { connection: "met" }, isolated: false },
    { date: d(7), needs: { food: "needs-help" } },
    { date: d(8), needs: { connection: "needs-help" }, isolated: true },
    { date: d(9), needs: { food: "needs-help" } },
    { date: d(10), needs: { connection: "needs-help" }, isolated: true },
  ]
  const hit = findTransition(entries, "need:food", "need:connection", 5)
  assert.deepEqual(hit, {
    from: "need:food",
    to: "need:connection",
    observed: 4,
    comparable: 5,
    percent: 80,
  })
})

test("learned need suggestions respect selected alert needs and minimum evidence", () => {
  const entries: CheckIn[] = []
  for (let i = 0; i < 12; i++) {
    entries.push({ date: d(i * 2 + 1), needs: { food: "needs-help" } })
    entries.push({ date: d(i * 2 + 2), needs: { hygiene: i < 9 ? "needs-help" : "met" } })
  }
  const today: CheckIn = { date: "2026-11-01", needs: { food: "needs-help" } }
  const all = learnedNeedSuggestions(entries, today, [])
  assert.ok(all.some((row) => row.need === "hygiene" && row.percent === 75))
  assert.equal(learnedNeedSuggestions(entries, today, ["connection"]).length, 0)
})

test("neural layer abstains before enough voluntary labeled history exists", () => {
  const entries: CheckIn[] = Array.from({ length: 20 }, (_, index) => ({
    date: d(index + 1),
    needs: { food: index % 2 ? "met" : "needs-help" },
    returnToUse: index % 5 === 0,
  }))
  const result = neuralPatternScore(entries, { date: "2026-11-01", needs: {} })
  assert.equal(result.status, "insufficient-data")
  assert.equal(result.labeledDays, 20)
})

test("neural layer becomes a bounded personal pattern score with enough labels", () => {
  const entries: CheckIn[] = Array.from({ length: 40 }, (_, index) => ({
    date: `2026-09-${String((index % 30) + 1).padStart(2, "0")}-${index}`,
    needs: {
      food: index % 4 === 0 ? "needs-help" : "met",
      hygiene: index % 5 === 0 ? "needs-help" : "met",
      connection: index % 3 === 0 ? "needs-help" : "met",
    },
    isolated: index % 3 === 0,
    craving: index % 6 === 0 ? "strong" : "none",
    sleepHours: index % 7 === 0 ? 4 : 7,
    returnToUse: index < 8,
  }))
  // Use valid unique ISO dates for the sanitizer-independent learner.
  entries.forEach((entry, index) => {
    const date = new Date(Date.UTC(2026, 0, 1 + index))
    entry.date = date.toISOString().slice(0, 10)
  })
  const result = neuralPatternScore(entries, {
    date: "2026-03-01",
    needs: { food: "needs-help", hygiene: "needs-help" },
    isolated: true,
    craving: "strong",
    sleepHours: 4,
  })
  assert.equal(result.status, "ready")
  if (result.status === "ready") {
    assert.ok(result.score >= 0 && result.score <= 100)
    assert.match(result.note, /not a calibrated probability/i)
  }
})

test("transition output never infers unknown return-to-use labels", () => {
  const entries: CheckIn[] = Array.from({ length: 12 }, (_, index) => ({
    date: d(index + 1),
    needs: { food: index % 2 === 0 ? "needs-help" : "met" },
  }))
  assert.equal(transitionInsights(entries).some((row) => row.to === "return-to-use"), false)
})


test("neural need forecasters learn next-check-in Maslow needs from local history", () => {
  const entries: CheckIn[] = []
  for (let index = 0; index < 48; index++) {
    const date = new Date(Date.UTC(2026, 0, 1 + index))
    entries.push({
      date: date.toISOString().slice(0, 10),
      needs: {
        food: index % 2 === 0 ? "needs-help" : "met",
        hygiene: index % 4 === 1 ? "needs-help" : "met",
        connection: index % 3 === 0 ? "needs-help" : "met",
      },
      isolated: index % 3 === 0,
      sleepHours: index % 5 === 0 ? 4 : 7,
      meals: index % 2 === 0 ? [] : undefined,
    })
  }
  const forecasts = neuralNeedForecasts(entries, {
    date: "2026-03-01",
    needs: { food: "needs-help" },
    isolated: true,
    sleepHours: 4,
    meals: [],
  }, [], { minPairs: 20, minPositive: 4, minNegative: 8 })

  assert.ok(forecasts.length > 0)
  for (const forecast of forecasts) {
    assert.ok(forecast.score >= 0 && forecast.score <= 100)
    assert.match(forecast.note, /not a calibrated probability/i)
  }
})


test("transition chains require complete known 2–3 step sequences and abstain below evidence", () => {
  const entries: CheckIn[] = []
  for (let cycle = 0; cycle < 7; cycle++) {
    const base = cycle * 4
    for (const [offset, needs] of [
      [0, { food: "needs-help" as const }],
      [1, { hygiene: "needs-help" as const }],
      [2, { connection: "needs-help" as const }],
      [3, { treatment: cycle < 5 ? "needs-help" as const : "met" as const }],
    ] as const) {
      const date = new Date(Date.UTC(2026, 0, 1 + base + offset))
      entries.push({ date: date.toISOString().slice(0, 10), needs })
    }
  }

  const chains = transitionChains(entries, ["need:food"], {
    steps: [2, 3],
    minComparable: 5,
    minObserved: 2,
    limit: 20,
  })
  assert.ok(chains.some((row) =>
    row.steps === 2 &&
    row.events.join("->") === "need:food->need:hygiene->need:connection" &&
    row.comparable >= 5 &&
    row.observed >= 5
  ))
  assert.ok(chains.every((row) => row.steps === 2 || row.steps === 3))
  assert.equal(transitionChains(entries.slice(0, 8), ["need:food"], { minComparable: 5 }).length, 0)
})

test("transition chains exclude windows with unknown future answers from denominators", () => {
  const entries: CheckIn[] = []
  for (let cycle = 0; cycle < 6; cycle++) {
    const dates = [0, 1, 2].map((offset) =>
      new Date(Date.UTC(2026, 2, 1 + cycle * 3 + offset)).toISOString().slice(0, 10)
    )
    entries.push({ date: dates[0], needs: { food: "needs-help" } })
    entries.push({ date: dates[1], needs: { hygiene: "needs-help" } })
    entries.push({
      date: dates[2],
      needs: cycle === 5 ? {} : { connection: "needs-help" },
    })
  }

  const chain = transitionChains(entries, ["need:food"], {
    steps: [2],
    minComparable: 5,
    minObserved: 2,
    limit: 20,
  }).find((row) => row.events.join("->") === "need:food->need:hygiene->need:connection")

  assert.ok(chain)
  assert.equal(chain?.comparable, 5)
  assert.equal(chain?.observed, 5)
  assert.equal(chain?.percent, 100)
})

test("neural need horizon forecasts stay bounded to 2–3 check-ins and enforce evidence", () => {
  const entries: CheckIn[] = Array.from({ length: 60 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 4, 1 + index))
    return {
      date: date.toISOString().slice(0, 10),
      needs: {
        food: index % 3 === 0 ? "needs-help" as const : "met" as const,
        hygiene: index % 4 === 0 ? "needs-help" as const : "met" as const,
        connection: index % 5 === 0 ? "needs-help" as const : "met" as const,
      },
      isolated: index % 5 === 0,
      sleepHours: index % 6 === 0 ? 4 : 7,
    }
  })
  const today: CheckIn = {
    date: "2026-07-15",
    needs: { food: "needs-help" },
    isolated: true,
    sleepHours: 4,
  }

  const forecasts = neuralNeedHorizonForecasts(entries, today, [], {
    minPairs: 20,
    minPositive: 4,
    minNegative: 8,
  })
  assert.ok(forecasts.length > 0)
  assert.ok(forecasts.every((row) => row.horizon === 2 || row.horizon === 3))
  assert.ok(forecasts.every((row) => /not a calibrated probability/i.test(row.note)))
  assert.equal(
    neuralNeedHorizonForecasts(entries.slice(0, 8), today, [], { minPairs: 20 }).length,
    0,
  )
})
