import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  defaultGuardianState,
  readGuardianState,
  saveGuardianState,
  type CheckIn,
} from "../lib/guardian-stability"
import { gentlePrompts, timeInPromptWindow } from "../lib/guardian-prompts"

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

test("Feature 18 persists disabled-by-default user timing windows", () => {
  const state = defaultGuardianState()
  assert.ok(state.promptWindows.every((window) => window.enabled === false))

  const store = storage()
  const next = {
    ...state,
    enabled: true,
    promptWindows: state.promptWindows.map((window) =>
      window.category === "food"
        ? { ...window, enabled: true, start: "12:00", end: "13:00" }
        : window,
    ),
  }
  saveGuardianState(store, next)
  const loaded = readGuardianState(store)
  const food = loaded.promptWindows.find((window) => window.category === "food")
  assert.deepEqual(food, { category: "food", enabled: true, start: "12:00", end: "13:00" })
})

test("Feature 18 supports normal and overnight prompt windows", () => {
  assert.equal(timeInPromptWindow("12:30", { category: "food", enabled: true, start: "12:00", end: "13:00" }), true)
  assert.equal(timeInPromptWindow("14:00", { category: "food", enabled: true, start: "12:00", end: "13:00" }), false)
  assert.equal(timeInPromptWindow("23:30", { category: "sleep", enabled: true, start: "22:00", end: "01:00" }), true)
  assert.equal(timeInPromptWindow("00:30", { category: "sleep", enabled: true, start: "22:00", end: "01:00" }), true)
})

test("Feature 18 emits only enabled relevant prompts and preserves unknowns as unknown", () => {
  const state = defaultGuardianState()
  state.enabled = true
  state.promptWindows = state.promptWindows.map((window) =>
    window.category === "food" || window.category === "appointments"
      ? { ...window, enabled: true, start: "11:00", end: "14:00" }
      : window,
  )
  state.plan = [{
    id: "appt",
    date: "2026-10-13",
    title: "Clinic visit",
    done: false,
    kind: "appointment",
    time: "13:30",
  }]
  const today: CheckIn = { date: "2026-10-13", needs: {} }

  const prompts = gentlePrompts(state, today, { date: "2026-10-13", time: "12:00" })
  assert.deepEqual(prompts.map((prompt) => prompt.category), ["food", "appointments"])
  assert.match(prompts[0].reason, /unanswered today/)
  assert.match(prompts[1].reason, /entered yourself/)
})

test("Feature 18 never prompts while Guardian is paused and UI has no push-notification path", () => {
  const state = defaultGuardianState()
  state.enabled = true
  state.paused = true
  state.promptWindows = state.promptWindows.map((window) => ({ ...window, enabled: true }))
  const today: CheckIn = { date: "2026-10-13", needs: { food: "needs-help" } }
  assert.deepEqual(gentlePrompts(state, today, { date: "2026-10-13", time: "12:00" }), [])

  const component = readFileSync("components/guardian/guardian-gentle-prompts.tsx", "utf8")
  assert.match(component, /not push notifications, alarms, compliance checks, or penalties/)
  assert.match(component, /does not notify another person, deduct points, mark you noncompliant/)
  assert.doesNotMatch(component, /Notification\.|PushManager|fetch\(|\/api\//)
})
