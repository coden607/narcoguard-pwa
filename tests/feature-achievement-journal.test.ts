import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { defaultGuardianState, readGuardianState } from "../lib/guardian-stability"

test("Feature 10 persists only bounded private journal entries", () => {
  const state = defaultGuardianState()
  state.enabled = true
  state.journal = [
    { id: "a", date: "2026-10-10", title: "Kept my appointment", kind: "win" },
    { id: "b", date: "2026-10-11", title: "Pantry worked", kind: "resource" },
  ]

  const storage = {
    getItem: () => JSON.stringify(state),
    setItem: () => undefined,
    removeItem: () => undefined,
  }
  const loaded = readGuardianState(storage)
  assert.deepEqual(loaded.journal, state.journal)
})

test("Feature 10 rejects malformed journal records and caps stored history", () => {
  const state = defaultGuardianState()
  state.enabled = true
  const journal = Array.from({ length: 110 }, (_, index) => ({
    id: `id-${index}`,
    date: "2026-10-10",
    title: `Win ${index}`,
    kind: "win",
  }))
  const malformed = [
    { id: "bad-kind", date: "2026-10-10", title: "Bad", kind: "other" },
    { id: "bad-date", date: "yesterday", title: "Bad", kind: "win" },
  ]

  const storage = {
    getItem: () => JSON.stringify({ ...state, journal: [...malformed, ...journal] }),
    setItem: () => undefined,
    removeItem: () => undefined,
  }
  const loaded = readGuardianState(storage)
  assert.equal(loaded.journal.length, 100)
  assert.ok(loaded.journal.every((entry) => entry.kind === "win" || entry.kind === "resource"))
})

test("Feature 10 UI includes explicit wins/resources and only user-marked completed plans", () => {
  const component = readFileSync("components/guardian/guardian-achievement-journal.tsx", "utf8")
  const page = readFileSync("app/stability/page.tsx", "utf8")

  assert.match(component, /Private achievement journal/)
  assert.match(component, /Resource that worked/)
  assert.match(component, /state\.plan\s*\.filter\(\(item\) => item\.done\)/)
  assert.match(component, /does not infer that an appointment was kept or a resource worked/i)
  assert.match(component, /Completed appointment/)
  assert.match(component, /Completed stability action/)
  assert.match(page, /GuardianAchievementJournal/)
})
