import { strict as assert } from "node:assert"
import { test } from "node:test"
import { defaultGuardianState } from "../lib/guardian-stability"
import { guardianRewardSummary } from "../lib/guardian-rewards"

test("momentum rewards derive only from user-controlled local actions", () => {
  const state = {
    ...defaultGuardianState(),
    enabled: true,
    rewardEnabled: true,
    entries: [
      { date: "2026-10-10", needs: { food: "needs-help" as const }, meals: [{ id: "m1", kind: "breakfast" as const, description: "meal", timestamp: "2026-10-10T12:00:00.000Z" }] },
      { date: "2026-10-11", needs: { hygiene: "met" as const }, mood: "okay" as const },
    ],
    plan: [
      { id: "p1", date: "2026-10-11", title: "Take a shower", done: true },
      { id: "p2", date: "2026-10-12", title: "Call support", done: false },
    ],
  }

  const summary = guardianRewardSummary(state)
  assert.ok(summary.points > 0)
  assert.equal(summary.completedPlans, 1)
  assert.equal(summary.checkInDays, 2)
  assert.equal(summary.mealLogs, 1)
})

test("momentum rewards do not depend on return-to-use outcome", () => {
  const base = {
    ...defaultGuardianState(),
    enabled: true,
    entries: [{ date: "2026-10-10", needs: { food: "met" as const }, returnToUse: false }],
  }
  const a = guardianRewardSummary(base)
  const b = guardianRewardSummary({ ...base, entries: [{ ...base.entries[0], returnToUse: true }] })
  assert.equal(a.points, b.points)
})
