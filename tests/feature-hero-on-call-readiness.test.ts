import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { canGoOnCall, exactTotal, parseNaloxoneExpiry, readinessView, staleOnCallPath, utcDate } from "../lib/hero-readiness"

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

test("signup eligibility uses the UTC instant, not the phone's calendar day", () => {
  const now = Date.parse("2026-11-19T16:00:00.000Z")
  const tokyoWouldBeNextDay = readinessView({
    enrolled: true,
    expiresAt: "2026-11-19T20:00:00.000Z",
    naloxoneReady: true,
    naloxoneExpiresOn: "2026-11-19",
    now,
  })
  assert.equal(tokyoWouldBeNextDay.certCurrent, true)
  assert.equal(tokyoWouldBeNextDay.naloxoneCurrent, true)
  assert.equal(tokyoWouldBeNextDay.readyForCall, true)
  const alreadyExpired = readinessView({
    enrolled: true,
    expiresAt: "2026-11-19T15:00:00.000Z",
    naloxoneReady: true,
    naloxoneExpiresOn: "2026-11-19",
    now,
  })
  assert.equal(alreadyExpired.certCurrent, false)
  assert.equal(alreadyExpired.readyForCall, false)
})

test("the on-call total is the Content-Range count, and a stale clear names the row it read", () => {
  assert.equal(exactTotal("0-0/12"), 12)
  assert.equal(exactTotal("*/0"), 0)
  assert.equal(exactTotal("*"), null)
  assert.equal(exactTotal(null), null)
  const path = staleOnCallPath("user-1", "2026-11-19T16:00:00.000Z")
  assert.match(path, /on_call=eq\.true/)
  assert.match(path, /updated_at=eq\.2026-11-19T16%3A00%3A00\.000Z/)
  assert.equal(path.includes("user-1"), true)
  assert.equal(staleOnCallPath("user-1", "2026-11-19T16:00:01.000Z").includes("16%3A00%3A01"), true)
})

test("readiness stays separate from the nearby-request switch", async () => {
  const route = await readFile(new URL("../app/api/heroes/route.ts", import.meta.url), "utf8")
  const original = await readFile(new URL("../supabase/migrations/20261119010000_hero_on_call_readiness.sql", import.meta.url), "utf8")
  const updated = await readFile(new URL("../supabase/migrations/20261119020000_hero_readiness_updated_at.sql", import.meta.url), "utf8")
  const signup = await readFile(new URL("../app/hero-signup/page.tsx", import.meta.url), "utf8")
  assert.match(route, /const nearbyRequests = alertsStatus\(process\.env\)\.live/)
  assert.match(route, /nearbyRequests/)
  assert.match(route, /method: "HEAD"/)
  assert.match(route, /Prefer: "count=exact"/)
  assert.match(route, /exactTotal\(/)
  assert.match(route, /staleOnCallPath\(/)
  assert.doesNotMatch(route, /countResponse\.json\(\)/)
  assert.doesNotMatch(route, /HERO_ALERTS_ENABLED/)
  assert.match(signup, /readinessView\(/)
  assert.doesNotMatch(signup, /expires_at\.slice\(0, 10\)/)
  assert.match(updated, /new\.updated_at := now\(\)/)
  assert.doesNotMatch(original, /HERO_ALERTS_ENABLED/)
  assert.match(original, /hero_force_off_call_when_not_ready/)
  assert.match(original, /before insert or update on public\.hero_certifications/)
  assert.doesNotMatch(original, /add constraint hero_on_call_requires_readiness/i)
})
