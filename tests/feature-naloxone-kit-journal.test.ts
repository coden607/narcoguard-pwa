import assert from "node:assert/strict"
import { test } from "node:test"
import { naloxoneKitFreshness, normalizeNaloxoneKits } from "../lib/naloxone-kit-journal"
import { defaultGuardianState, readGuardianState } from "../lib/guardian-stability"

test("naloxone kit journal keeps bounded local labels and checked dates", () => {
  const input = [
    { id: "a", location: " Backpack ", checkedOn: "2026-10-19" },
    { id: "a", location: "duplicate", checkedOn: "2026-10-19" },
    { id: "bad", location: "", checkedOn: "2026-10-19" },
    { id: "bad-date", location: "glovebox", checkedOn: "today" },
  ]
  assert.deepEqual(normalizeNaloxoneKits(input), [{ id: "a", location: "Backpack", checkedOn: "2026-10-19" }])
})

test("freshness describes only how old the location check is", () => {
  assert.equal(naloxoneKitFreshness("2026-10-19", "2026-10-19"), "checked-recently")
  assert.equal(naloxoneKitFreshness("2026-07-01", "2026-10-19"), "check-is-old")
  assert.equal(naloxoneKitFreshness("2026-10-20", "2026-10-19"), "future-date")
})

test("Guardian state sanitizes kit locations and erases them with the planner state", () => {
  const raw = {
    ...defaultGuardianState(),
    enabled: true,
    naloxoneKits: [{ id: "kit-1", location: "Glovebox", checkedOn: "2026-10-19" }],
  }
  const storage = {
    getItem: () => JSON.stringify(raw),
    setItem: () => undefined,
    removeItem: () => undefined,
  }
  const state = readGuardianState(storage)
  assert.deepEqual(state.naloxoneKits, [{ id: "kit-1", location: "Glovebox", checkedOn: "2026-10-19" }])
})
