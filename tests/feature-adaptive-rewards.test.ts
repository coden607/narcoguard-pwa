import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { defaultGuardianState, readGuardianState, saveGuardianState } from "../lib/guardian-stability"
import { guardianRewardSummary } from "../lib/guardian-rewards"

class Store {
  data = new Map<string, string>()
  getItem(key: string) { return this.data.get(key) ?? null }
  setItem(key: string, value: string) { this.data.set(key, value) }
  removeItem(key: string) { this.data.delete(key) }
}

test("Feature 9 lets selected categories control local reward points", () => {
  const base = {
    ...defaultGuardianState(),
    enabled: true,
    rewardEnabled: true,
    rewardCategories: ["plans"] as const as any,
    rewardMilestoneStep: 25,
    entries: [
      { date: "2026-10-01", needs: { food: "met" as const } },
      { date: "2026-10-02", needs: { food: "met" as const } },
    ],
    plan: [
      { id: "p1", date: "2026-10-01", title: "Call support", done: true },
      { id: "p2", date: "2026-10-02", title: "Get meal", done: true },
    ],
  }
  const summary = guardianRewardSummary(base)
  assert.equal(summary.points, 20)
  assert.equal(summary.milestone, 0)
  assert.equal(summary.nextMilestone, 25)

  const all = guardianRewardSummary({ ...base, rewardCategories: ["checkins", "meals", "needs", "plans"] })
  assert.ok(all.points > summary.points)
})

test("Feature 9 reward preferences survive the local Guardian schema", () => {
  const store = new Store()
  saveGuardianState(store, {
    ...defaultGuardianState(),
    enabled: true,
    rewardEnabled: true,
    rewardCategories: ["checkins", "plans"],
    rewardMilestoneStep: 100,
  })
  const saved = readGuardianState(store)
  assert.deepEqual(saved.rewardCategories, ["checkins", "plans"])
  assert.equal(saved.rewardMilestoneStep, 100)
})

test("Feature 9 UI rejects streak penalties and exposes personalization controls", () => {
  const panel = readFileSync("components/guardian/guardian-rewards-panel.tsx", "utf8")
  assert.match(panel, /Choose what feels rewarding/)
  assert.match(panel, /Only selected action categories contribute points/)
  assert.match(panel, /No streaks, missed-day penalties, loss framing, or escalating pressure/)
})
