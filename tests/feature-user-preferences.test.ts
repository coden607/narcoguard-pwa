import assert from "node:assert/strict"
import { test } from "node:test"
import { getUserPreferences, parseUserPreferences, readStoredPreferences, resetUserPreferences, saveUserPreferences } from "../lib/user-preferences"

test("partial saved preferences retain nested defaults and reject invalid collection values", () => {
  const state = parseUserPreferences(JSON.stringify({ name: "Test", emergencyPreferences: { soundAlarm: false }, legal: null, emergencyContacts: null, naloxoneLocations: "invalid" }))
  assert.equal(state.emergencyPreferences.soundAlarm, false)
  assert.equal(state.emergencyPreferences.call911, true)
  assert.equal(state.legal.acceptedTerms, false)
  assert.deepEqual(state.emergencyContacts, [])
  assert.deepEqual(state.naloxoneLocations, [])
})

test("a naloxone note with only a description or only a place is kept", () => {
  const described = parseUserPreferences(JSON.stringify({ naloxoneLocations: [{ id: "nightstand", description: "Bedroom nightstand", location: "" }] }))
  assert.equal(described.naloxoneLocations.length, 1)
  assert.equal(described.naloxoneLocations[0]?.description, "Bedroom nightstand")
  assert.equal(described.naloxoneLocations[0]?.location, "")
  const placed = parseUserPreferences(JSON.stringify({ naloxoneLocations: [{ id: "drawer", description: "", location: "Top drawer, left side", instructions: "Behind the lamp" }] }))
  assert.equal(placed.naloxoneLocations[0]?.location, "Top drawer, left side")
  assert.equal(placed.naloxoneLocations[0]?.instructions, "Behind the lamp")
  const blank = parseUserPreferences(JSON.stringify({ naloxoneLocations: [{ id: "empty", description: "  ", location: "", instructions: "" }] }))
  assert.deepEqual(blank.naloxoneLocations, [])
})

test("malformed saved fields cannot bypass setup or become unsafe contact links", () => {
  const state = parseUserPreferences(JSON.stringify({ hasCompletedOnboarding: "false", name: {}, emergencyContacts: [null, { id: "1", name: "Test", phone: "javascript:bad" }], features: { voiceActivation: "false" } }))
  assert.equal(state.hasCompletedOnboarding, false)
  assert.equal(state.name, "")
  assert.deepEqual(state.emergencyContacts, [])
  assert.equal(state.features.voiceActivation, true)
})

test("default objects are independent between reads", () => {
  const first = parseUserPreferences(null)
  first.emergencyContacts.push({ id: "1", name: "Test", phone: "6075550100", relationship: "friend", notifyMethod: "call" })
  first.legal.acceptedTerms = true
  assert.deepEqual(parseUserPreferences(null).emergencyContacts, [])
  assert.equal(parseUserPreferences(null).legal.acceptedTerms, false)
})

test("blocked browser storage still permits setup for this visit and reset clears it", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
  const events = new EventTarget()
  Object.defineProperty(globalThis, "window", { configurable: true, value: events })
  Object.defineProperty(globalThis, "localStorage", { configurable: true, get() { throw new Error("Storage blocked") } })
  try {
    assert.doesNotThrow(() => saveUserPreferences({ name: "Test", hasCompletedOnboarding: true }))
    assert.equal(getUserPreferences().hasCompletedOnboarding, true)
    assert.equal(JSON.parse(readStoredPreferences()).name, "Test")
    assert.doesNotThrow(() => resetUserPreferences())
    assert.equal(getUserPreferences().hasCompletedOnboarding, false)
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
    else Reflect.deleteProperty(globalThis, "window")
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage)
    else Reflect.deleteProperty(globalThis, "localStorage")
  }
})
