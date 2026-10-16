import { strict as assert } from "node:assert"
import { test } from "node:test"
import { defaultLifeSupportState, disruptionSteps, readLifeSupportState } from "../lib/life-support"

class MemoryStorage {
  value: string | null = null
  getItem() { return this.value }
  setItem(_key: string, value: string) { this.value = value }
  removeItem() { this.value = null }
}

test("life support defaults to opt-in and empty", () => {
  const state = defaultLifeSupportState()
  assert.equal(state.enabled, false)
  assert.deepEqual(state.constraints, [])
})

test("life support reader rejects malformed data safely", () => {
  const storage = new MemoryStorage()
  storage.value = "{bad json"
  assert.deepEqual(readLifeSupportState(storage), defaultLifeSupportState())
})

test("disruption mode produces a minimal user-goal-led plan", () => {
  const state = defaultLifeSupportState()
  state.enabled = true
  state.topGoal = "keep my job"
  state.careTasks = [{ id: "1", title: "pack lunch", done: false }]
  state.transport.primary = "bus"
  const steps = disruptionSteps(state)
  assert.equal(steps[0], "Protect today's priority: keep my job.")
  assert.ok(steps.some((step) => step.includes("pack lunch")))
  assert.ok(steps.some((step) => step.includes("bus")))
  assert.ok(steps.length <= 4)
})
