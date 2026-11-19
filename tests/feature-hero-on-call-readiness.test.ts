import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { canGoOnCall, parseNaloxoneExpiry, utcDate } from "../lib/hero-readiness"

const now = Date.parse("2026-11-19T15:00:00.000Z")
const today = utcDate(new Date(now))
const ready = {
  enrolled: true,
  expiresAt: "2027-11-19T15:00:00.000Z",
  naloxoneReady: true,
  naloxoneExpiresOn: "2026-12-01",
  now,
  today,
}

test("On Call requires enrollment, a current certificate, and unexpired naloxone", () => {
  assert.equal(canGoOnCall(ready), true)
  assert.equal(canGoOnCall({ ...ready, enrolled: false }), false)
  assert.equal(canGoOnCall({ ...ready, expiresAt: "2026-11-19T14:00:00.000Z" }), false)
  assert.equal(canGoOnCall({ ...ready, naloxoneReady: false }), false)
  assert.equal(canGoOnCall({ ...ready, naloxoneExpiresOn: "2026-11-18" }), false)
  assert.equal(canGoOnCall({ ...ready, naloxoneExpiresOn: null }), false)
  assert.equal(canGoOnCall({ ...ready, naloxoneExpiresOn: today }), true)
})

test("a naloxone date is empty or a real calendar day", () => {
  assert.deepEqual(parseNaloxoneExpiry(""), { ok: true, date: null })
  assert.deepEqual(parseNaloxoneExpiry(undefined), { ok: true, date: null })
  assert.deepEqual(parseNaloxoneExpiry("2026-12-01"), { ok: true, date: "2026-12-01" })
  assert.deepEqual(parseNaloxoneExpiry("2026-1-01"), { ok: false })
  assert.deepEqual(parseNaloxoneExpiry("today"), { ok: false })
  assert.deepEqual(parseNaloxoneExpiry(true), { ok: false })
})

test("readiness stays separate from the nearby-request switch", async () => {
  const route = await readFile(new URL("../app/api/heroes/route.ts", import.meta.url), "utf8")
  const migration = await readFile(new URL("../supabase/migrations/20261119010000_hero_on_call_readiness.sql", import.meta.url), "utf8")
  assert.match(route, /const nearbyRequests = alertsStatus\(process\.env\)\.live/)
  assert.match(route, /nearbyRequests/)
  assert.match(route, /canGoOnCall/)
  assert.doesNotMatch(route, /HERO_ALERTS_ENABLED/)
  assert.doesNotMatch(migration, /HERO_ALERTS_ENABLED/)
  assert.match(migration, /hero_force_off_call_when_not_ready/)
  assert.match(migration, /before insert or update on public\.hero_certifications/)
  assert.doesNotMatch(migration, /add constraint hero_on_call_requires_readiness/i)
  assert.doesNotMatch(migration, /HERO_ALERTS_ENABLED/)
})
