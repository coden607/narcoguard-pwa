import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  findTransition,
  learnedNeedSuggestions,
  neuralPatternScore,
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
