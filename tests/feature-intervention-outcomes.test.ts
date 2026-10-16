import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { interventionOutcomeInsights } from "../lib/intervention-outcomes"
import type { CheckIn, PlanItem } from "../lib/guardian-stability"

test("Feature 8 learns only from completed need-tagged user plan steps", () => {
  const plan: PlanItem[] = [
    { id: "1", date: "2026-01-01", title: "Call pantry", done: true, need: "food" },
    { id: "2", date: "2026-01-03", title: "Call pantry", done: true, need: "food" },
    { id: "3", date: "2026-01-05", title: "Call pantry", done: true, need: "food" },
    { id: "4", date: "2026-01-07", title: "Ignored incomplete", done: false, need: "food" },
    { id: "5", date: "2026-01-09", title: "No need tag", done: true },
  ]
  const entries: CheckIn[] = [
    { date: "2026-01-02", needs: { food: "met" } },
    { date: "2026-01-04", needs: { food: "needs-help" } },
    { date: "2026-01-06", needs: { food: "met" } },
    { date: "2026-01-08", needs: { food: "met" } },
    { date: "2026-01-10", needs: { food: "met" } },
  ]

  assert.deepEqual(interventionOutcomeInsights(entries, plan), [{
    need: "food",
    title: "Call pantry",
    followedByMet: 2,
    comparable: 3,
    percent: 67,
  }])
})

test("Feature 8 waits for the next answered check-in and abstains below evidence", () => {
  const plan: PlanItem[] = [
    { id: "1", date: "2026-02-01", title: "Shower stop", done: true, need: "hygiene" },
    { id: "2", date: "2026-02-05", title: "Shower stop", done: true, need: "hygiene" },
  ]
  const entries: CheckIn[] = [
    { date: "2026-02-02", needs: {} },
    { date: "2026-02-03", needs: { hygiene: "met" } },
    { date: "2026-02-06", needs: { hygiene: "met" } },
  ]

  assert.equal(interventionOutcomeInsights(entries, plan).length, 0)
  const relaxed = interventionOutcomeInsights(entries, plan, 2)
  assert.equal(relaxed[0]?.comparable, 2)
  assert.equal(relaxed[0]?.followedByMet, 2)
})

test("Feature 8 UI states local descriptive non-causal boundaries", () => {
  const panel = readFileSync("components/guardian/intervention-outcome-panel.tsx", "utf8")
  assert.match(panel, /Unknown answers are excluded/)
  assert.match(panel, /not proof that a step caused an outcome/i)
  assert.match(panel, /Abstaining for now/)
})
