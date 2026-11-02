import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { BREATH_INTERVAL_MS, RESCUE_BREATHING_SETUP, breathsCued, msUntilNextBreath } from "../lib/rescue-breathing"

test("the metronome cues one breath every 5 seconds", () => {
  assert.equal(BREATH_INTERVAL_MS, 5000)
  assert.equal(breathsCued(0), 1)
  assert.equal(breathsCued(4_999), 1)
  assert.equal(breathsCued(5_000), 2)
  assert.equal(breathsCued(60_000), 13)
  assert.equal(msUntilNextBreath(1_000), 4_000)
  assert.equal(msUntilNextBreath(5_000), 5_000)
})

test("bad clock values never produce negative or NaN cues", () => {
  assert.equal(breathsCued(-1), 0)
  assert.equal(breathsCued(Number.NaN), 0)
  assert.equal(msUntilNextBreath(-10), 5_000)
})

test("setup starts with 911 and the page keeps Call 911 and sources", () => {
  assert.match(RESCUE_BREATHING_SETUP[0], /Call 911/)
  const page = readFileSync("app/rescue-breathing/page.tsx", "utf8")
  assert.match(page, /tel:911/)
  assert.match(page, /SourceList/)
  assert.match(readFileSync("lib/rescue-breathing.ts", "utf8"), /NEEDS CLINICAL REVIEW/)
})
