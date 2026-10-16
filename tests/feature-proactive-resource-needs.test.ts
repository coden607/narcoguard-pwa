import { strict as assert } from "node:assert"
import { test } from "node:test"
import { anticipateResourceNeeds, questionsForUnknowns } from "../lib/proactive-resource-needs"
import type { CheckIn, PlanItem } from "../lib/guardian-stability"

test("late morning missing breakfast log creates a food planning cue, not a claimed missed meal", () => {
  const history: CheckIn[] = [
    { date: "2026-10-04", needs: {}, meals: [{ id: "1", kind: "breakfast" }] },
    { date: "2026-10-05", needs: {}, meals: [{ id: "2", kind: "lunch" }] },
  ]
  const today: CheckIn = { date: "2026-10-06", needs: {} }
  const cues = anticipateResourceNeeds({ entries: history, today, plan: [], now: { date: "2026-10-06", time: "12:00" } })
  const cue = cues.find((item) => item.id === "breakfast-check")
  assert.ok(cue)
  assert.equal(cue?.need, "food")
  assert.match(cue?.detail ?? "", /missing log is not treated as proof/i)
  assert.deepEqual(questionsForUnknowns(today, cues).map((item) => item.need), ["food"])
})

test("an explicit met food status suppresses the late-morning food cue", () => {
  const today: CheckIn = { date: "2026-10-06", needs: { food: "met" } }
  const history: CheckIn[] = [
    { date: "2026-10-04", needs: {}, meals: [{ id: "1", kind: "breakfast" }] },
    { date: "2026-10-05", needs: {}, meals: [{ id: "2", kind: "lunch" }] },
  ]
  const cues = anticipateResourceNeeds({ entries: history, today, plan: [], now: { date: "2026-10-06", time: "12:00" } })
  assert.equal(cues.some((item) => item.need === "food"), false)
})

test("an early plan tomorrow plus an explicit recent food need searches before the morning", () => {
  const entries: CheckIn[] = [{ date: "2026-10-05", needs: { food: "needs-help" } }]
  const today: CheckIn = { date: "2026-10-06", needs: {} }
  const plan: PlanItem[] = [{ id: "work", date: "2026-10-07", title: "Work", done: false, kind: "appointment", time: "08:00" }]
  const cues = anticipateResourceNeeds({ entries, today, plan, now: { date: "2026-10-06", time: "19:00" } })
  assert.ok(cues.some((item) => item.id === "food-before-morning-plan" && item.horizon === "tomorrow"))
})

test("repeated hygiene need creates an evening planning cue while unknown stays unknown", () => {
  const entries: CheckIn[] = [
    { date: "2026-10-04", needs: { hygiene: "needs-help" } },
    { date: "2026-10-05", needs: { hygiene: "needs-help" } },
  ]
  const today: CheckIn = { date: "2026-10-06", needs: {} }
  const cues = anticipateResourceNeeds({ entries, today, plan: [], now: { date: "2026-10-06", time: "20:00" } })
  assert.ok(cues.some((item) => item.need === "hygiene"))
  assert.equal(today.needs.hygiene, undefined)
  assert.ok(questionsForUnknowns(today, cues).some((item) => item.need === "hygiene"))
})
