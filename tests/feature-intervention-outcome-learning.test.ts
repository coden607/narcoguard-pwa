import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { interventionOutcomeInsights } from "../lib/adaptive-guardian"
import type { CheckIn, PlanItem } from "../lib/guardian-stability"

test("Feature 8 learns only from completed user-created plans with linked needs", () => {
  const entries: CheckIn[] = [
    { date: "2026-01-02", needs: { food: "met" } },
    { date: "2026-01-04", needs: { food: "needs-help" } },
    { date: "2026-01-06", needs: { food: "met" } },
    { date: "2026-01-08", needs: { food: "met" } },
  ]
  const plan: PlanItem[] = [
    { id: "1", date: "2026-01-01", title: "Visit pantry", done: true, need: "food" },
    { id: "2", date: "2026-01-03", title: "Visit pantry", done: true, need: "food" },
    { id: "3", date: "2026-01-05", title: "Visit pantry", done: true, need: "food" },
    { id: "4", date: "2026-01-07", title: "Visit pantry", done: false, need: "food" },
    { id: "5", date: "2026-01-07", title: "Unlinked task", done: true },
  ]

  const insights = interventionOutcomeInsights(entries, plan, { minComparable: 3 })
  assert.deepEqual(insights, [{
    intervention: "Visit pantry",
    need: "food",
    met: 2,
    comparable: 3,
    percent: 67,
  }])
})

test("Feature 8 skips unknown answers and uses only the first later explicit answer", () => {
  const entries: CheckIn[] = [
    { date: "2026-02-02", needs: {} },
    { date: "2026-02-03", needs: { hygiene: "met" } },
    { date: "2026-02-05", needs: { hygiene: "needs-help" } },
    { date: "2026-02-06", needs: { hygiene: "met" } },
  ]
  const plan: PlanItem[] = [
    { id: "1", date: "2026-02-01", title: "Use shower resource", done: true, need: "hygiene" },
    { id: "2", date: "2026-02-04", title: "Use shower resource", done: true, need: "hygiene" },
  ]

  const insights = interventionOutcomeInsights(entries, plan, { minComparable: 2 })
  assert.deepEqual(insights, [{
    intervention: "Use shower resource",
    need: "hygiene",
    met: 1,
    comparable: 2,
    percent: 50,
  }])
})

test("Feature 8 abstains below the evidence threshold and UI rejects causal claims", () => {
  const entries: CheckIn[] = [
    { date: "2026-03-02", needs: { connection: "met" } },
    { date: "2026-03-04", needs: { connection: "met" } },
  ]
  const plan: PlanItem[] = [
    { id: "1", date: "2026-03-01", title: "Call support person", done: true, need: "connection" },
    { id: "2", date: "2026-03-03", title: "Call support person", done: true, need: "connection" },
  ]

  assert.equal(interventionOutcomeInsights(entries, plan).length, 0)

  const panel = readFileSync("components/guardian/adaptive-guardian-panel.tsx", "utf8")
  assert.match(panel, /at least 3 completed plans/i)
  assert.match(panel, /historical association/i)
  assert.match(panel, /not evidence that the plan or resource caused the outcome/i)
})
