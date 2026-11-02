import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { WARNING_MS, endsAtFor, formatRemaining, phaseAt, remainingMs } from "../lib/check-on-me"

test("durations are limited to the offered choices", () => {
  assert.equal(endsAtFor(0, 5), 300_000)
  assert.equal(endsAtFor(0, 7), 600_000)
})

test("the phase moves from running to warning to alarm", () => {
  const endsAt = endsAtFor(0, 5)
  assert.equal(phaseAt(null, 0), "idle")
  assert.equal(phaseAt(endsAt, 0), "running")
  assert.equal(phaseAt(endsAt, endsAt - WARNING_MS), "warning")
  assert.equal(phaseAt(endsAt, endsAt), "alarm")
  assert.equal(phaseAt(endsAt, endsAt + 999_999), "alarm")
})

test("remaining time is formatted and never negative", () => {
  assert.equal(remainingMs(1000, 5000), 0)
  assert.equal(formatRemaining(600_000), "10:00")
  assert.equal(formatRemaining(61_001), "1:02")
})

test("the timer contacts no one and keeps the screen on", () => {
  const component = readFileSync("components/harm-reduction/check-on-me-timer.tsx", "utf8")
  assert.doesNotMatch(component, /fetch\(|sendBeacon|XMLHttpRequest|sms:/)
  assert.match(component, /useWakeLock/)
  assert.match(component, /tel:911/)
})
