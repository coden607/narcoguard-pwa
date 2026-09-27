import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  clearGuardianState,
  defaultGuardianState,
  readGuardianState,
  saveGuardianState,
  summarizePattern,
  type CheckIn,
} from "../lib/guardian-stability"

function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value) },
    removeItem: (key: string) => { values.delete(key) },
  }
}

test("off by default and malformed history is ignored", () => {
  const store = storage()
  assert.equal(readGuardianState(store).enabled, false)
  store.setItem("narcoguard_guardian_stability_v1", "{invalid")
  assert.deepEqual(readGuardianState(store), defaultGuardianState())
  store.setItem("narcoguard_guardian_stability_v1", JSON.stringify({ enabled: true, entries: "bad" }))
  assert.deepEqual(readGuardianState(store), defaultGuardianState())
})

test("consent gates storage; pause blocks new entries and erase clears all data", () => {
  const store = storage()
  const entry: CheckIn = { date: "2026-09-27", needs: { food: "needs-help" }, sleepHours: 6 }
  saveGuardianState(store, { ...defaultGuardianState(), entries: [entry] })
  assert.equal(readGuardianState(store).entries.length, 0)
  const enabled = { ...defaultGuardianState(), enabled: true, entries: [entry], goals: ["Find work"], supportPhone: "6075550100" }
  saveGuardianState(store, enabled)
  assert.equal(readGuardianState(store).entries.length, 1)
  saveGuardianState(store, { ...enabled, paused: true })
  saveGuardianState(store, { ...enabled, paused: true, entries: [...enabled.entries, { ...entry, date: "2026-09-28" }] })
  assert.equal(readGuardianState(store).entries.length, 1)
  clearGuardianState(store)
  assert.deepEqual(readGuardianState(store), defaultGuardianState())
})

test("pattern count excludes unknown days and requires five answered food entries", () => {
  const entries: CheckIn[] = Array.from({ length: 10 }, (_, index) => ({
    date: `2026-09-${String(index + 1).padStart(2, "0")}`,
    needs: { food: "needs-help", connection: index < 3 ? "needs-help" : "met" },
  }))
  entries.push({ date: "2026-09-20", needs: { connection: "needs-help" } })
  assert.deepEqual(summarizePattern(entries), { observed: 3, answered: 10, percent: 30 })
  assert.equal(summarizePattern(entries.slice(0, 4)), null)
  assert.equal(summarizePattern([{ date: "2026-09-27", needs: {} }]), null)
})
