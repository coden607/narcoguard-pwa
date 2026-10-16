import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  PREPAREDNESS_ITEMS,
  defaultGuardianState,
  readGuardianState,
  saveGuardianState,
} from "../lib/guardian-stability"

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

test("Feature 17 persists only explicit bounded preparedness categories", () => {
  const store = storage()
  saveGuardianState(store, {
    ...defaultGuardianState(),
    enabled: true,
    preparedness: ["naloxone", "power", "transit", "support-person"],
  })

  const loaded = readGuardianState(store)
  assert.deepEqual(loaded.preparedness, ["naloxone", "power", "transit", "support-person"])
})

test("Feature 17 sanitizes duplicates and unknown preparedness values", () => {
  const store = storage()
  store.setItem("narcoguard_guardian_stability_v2", JSON.stringify({
    ...defaultGuardianState(),
    enabled: true,
    preparedness: ["food", "food", "unknown", "medications-appointments", "support-person"],
  }))

  const loaded = readGuardianState(store)
  assert.deepEqual(loaded.preparedness, ["food", "medications-appointments", "support-person"])
  assert.ok(loaded.preparedness.every((item) => PREPAREDNESS_ITEMS.includes(item)))
})

test("Feature 17 checklist is private, user-selected, and makes no verified-readiness claim", () => {
  const component = readFileSync("components/guardian/guardian-preparedness-plan.tsx", "utf8")
  const page = readFileSync("app/stability/page.tsx", "utf8")

  assert.match(component, /Personal preparedness plan/)
  assert.match(component, /Check only what you personally consider ready/)
  assert.match(component, /Nothing is inferred, graded, or shared/)
  assert.match(component, /does not ask for medication names here/)
  assert.match(component, /does not verify supplies, medication access, transportation, appointments/)
  assert.match(component, /disabled=\{state\.paused\}/)
  assert.match(page, /GuardianPreparednessPlan/)
  assert.doesNotMatch(component, /fetch\(|\/api\//)
})
