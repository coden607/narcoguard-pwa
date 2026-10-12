import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { neuralNeedHorizonForecasts, transitionChains } from "../lib/adaptive-guardian"
import type { CheckIn } from "../lib/guardian-stability"

test("Feature 7 exposes bounded 2–3 step descriptive chains with abstention copy", () => {
  const panel = readFileSync("components/guardian/adaptive-guardian-panel.tsx", "utf8")
  assert.match(panel, /Longer personal need chains/)
  assert.match(panel, /2–3 step chain/)
  assert.match(panel, /at least 5 comparable starts/)
  assert.match(panel, /descriptive history, not causation or a prediction/i)
  assert.match(panel, /Abstaining for now/)
})

test("Feature 7 excludes unknown chain outcomes from the denominator", () => {
  const entries: CheckIn[] = []
  for (let cycle = 0; cycle < 6; cycle++) {
    const base = cycle * 3
    const date = (offset: number) =>
      new Date(Date.UTC(2026, 0, 1 + base + offset)).toISOString().slice(0, 10)
    entries.push({ date: date(0), needs: { food: "needs-help" } })
    entries.push({ date: date(1), needs: { hygiene: "needs-help" } })
    entries.push({
      date: date(2),
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
  assert.equal(chain.comparable, 5)
  assert.equal(chain.observed, 5)
  assert.equal(chain.percent, 100)
})

test("Feature 7 neural horizons stay bounded and abstain without enough evidence", () => {
  const entries: CheckIn[] = Array.from({ length: 60 }, (_, index) => ({
    date: new Date(Date.UTC(2026, 2, 1 + index)).toISOString().slice(0, 10),
    needs: {
      food: index % 3 === 0 ? "needs-help" : "met",
      hygiene: index % 4 === 0 ? "needs-help" : "met",
      connection: index % 5 === 0 ? "needs-help" : "met",
    },
    isolated: index % 5 === 0,
    sleepHours: index % 6 === 0 ? 4 : 7,
  }))

  const today: CheckIn = {
    date: "2026-06-01",
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
