import { strict as assert } from "node:assert"
import { test } from "node:test"
import { normalizeMeeting, meetingState, readMeetings, saveMeetings } from "../lib/meeting-discovery"

const input = { id: "one", name: "Provider meeting", sourceUrl: "https://meetings.smartrecovery.org/meetings/123/", schedule: "Tuesday 18:00", timezone: "America/New_York", updatedAt: "2026-10-16", checkedAt: "2026-10-17", status: "listed" }
test("meeting preserves provider provenance and timezone without claiming availability", () => {
  const row = normalizeMeeting(input)!
  assert.equal(row.timezone, "America/New_York")
  assert.equal(row.updatedAt, "2026-10-16")
  assert.equal(meetingState(row, new Date("2026-10-17T12:00:00Z")), "Listed by source — confirm before attending")
})
test("cancelled, stale, and unknown meeting states are explicit", () => {
  assert.equal(meetingState(normalizeMeeting({ ...input, status: "cancelled" })!), "Cancelled according to saved source")
  assert.equal(meetingState(normalizeMeeting(input)!, new Date("2026-12-01")), "Check is out of date — confirm with provider")
  const row = normalizeMeeting({ ...input, schedule: "", timezone: "", updatedAt: "", checkedAt: "", status: "unknown" })!
  assert.equal(row.timezone, null)
  assert.equal(row.updatedAt, null)
  assert.equal(meetingState(row), "Meeting status unknown — confirm with provider")
})
test("meeting input rejects unsafe URLs and invalid zones/dates", () => {
  for (const patch of [{ sourceUrl: "javascript:alert(1)" }, { timezone: "bogus/zone" }, { updatedAt: "2026-02-31" }]) assert.equal(normalizeMeeting({ ...input, ...patch }), null)
})
test("local meeting records round trip and erasure removes all saved meetings", () => {
  const values = new Map<string, string>()
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
  saveMeetings(storage, [normalizeMeeting(input)!])
  assert.equal(readMeetings(storage).length, 1)
  saveMeetings(storage, [])
  assert.deepEqual(readMeetings(storage), [])
})
