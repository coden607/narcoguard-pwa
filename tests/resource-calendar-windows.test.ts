import { strict as assert } from "node:assert"
import { test } from "node:test"
import { upcomingOpeningWindows } from "../lib/opening-hours"

test("upcoming opening windows expand supported recurring hours without guessing", () => {
  const from = new Date("2026-10-12T08:00:00")
  const windows = upcomingOpeningWindows("Mo-Fr 09:00-12:00,13:00-17:00", from, 3)
  assert.equal(windows.length, 6)
  assert.equal(windows[0].dayLabel, "Mon")
  assert.equal(windows[0].start, "9 AM")
  assert.equal(windows[0].end, "12 PM")
})

test("unsupported opening-hours syntax yields no calendar windows", () => {
  const windows = upcomingOpeningWindows("sunrise-sunset", new Date("2026-10-12T08:00:00"), 7)
  assert.deepEqual(windows, [])
})

test("overnight windows are labeled explicitly", () => {
  const windows = upcomingOpeningWindows("Mo 20:00-02:00", new Date("2026-10-12T08:00:00"), 1)
  assert.equal(windows.length, 1)
  assert.equal(windows[0].crossesMidnight, true)
})
