import { strict as assert } from "node:assert"
import { test } from "node:test"
import { applyMealObservation, applyNeedObservation } from "../lib/observation-autolog"
import type { CheckIn } from "../lib/guardian-stability"

test("explicit certain need observations may be logged automatically", () => {
  const entry: CheckIn = { date: "2026-10-06", needs: {} }
  const result = applyNeedObservation(entry, { need: "water", status: "met", source: "user_action", confidence: "certain" })
  assert.equal(result.action, "logged")
  if (result.action === "logged") assert.equal(result.value.needs.water, "met")
})

test("assistant inference never silently becomes a need fact", () => {
  const entry: CheckIn = { date: "2026-10-06", needs: {} }
  const result = applyNeedObservation(entry, { need: "food", status: "needs-help", source: "assistant_inference", confidence: "certain" })
  assert.equal(result.action, "ask")
  assert.equal(entry.needs.food, undefined)
})

test("uncertain meal observations ask instead of inventing a meal", () => {
  const entry: CheckIn = { date: "2026-10-06", needs: {} }
  const result = applyMealObservation(entry, { kind: "lunch", source: "trusted_integration", confidence: "uncertain" }, "meal-1")
  assert.equal(result.action, "ask")
  assert.equal(entry.meals, undefined)
})

test("certain trusted meal observations can be logged", () => {
  const entry: CheckIn = { date: "2026-10-06", needs: {} }
  const result = applyMealObservation(entry, { kind: "lunch", note: "Observed from confirmed meal action", source: "trusted_integration", confidence: "certain" }, "meal-1")
  assert.equal(result.action, "logged")
  if (result.action === "logged") assert.equal(result.value.meals?.[0]?.kind, "lunch")
})
