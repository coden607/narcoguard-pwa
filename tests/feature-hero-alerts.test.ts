import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  MAX_AVAILABILITY_MS,
  MAX_HEROES_PER_REQUEST,
  REQUEST_TTL_MS,
  alertText,
  alertsStatus,
  cellKey,
  cellOf,
  matchHeroes,
  nearbyCells,
  prepareAvailability,
  prepareRequest,
  visibleRequests,
  type HeroAvailability,
  type HeroRequest,
} from "../lib/hero-alerts"

const NOW = 1_800_000_000_000
const CERT = NOW + 365 * 86_400_000
const hero = (id: string, lat: number, lon: number, extra: Partial<HeroAvailability> = {}): HeroAvailability =>
  ({ heroId: id, cell: cellKey(cellOf(lat, lon)!), availableUntil: NOW + 3_600_000, paused: false, certificateExpiresAt: CERT, ...extra })

test("alerts stay off unless explicitly switched on and fully configured", () => {
  assert.equal(alertsStatus({}).live, false)
  assert.match(alertsStatus({}).reason, /safety and privacy review/)
  assert.equal(alertsStatus({ HERO_ALERTS_ENABLED: "yes" }).live, false)
  assert.equal(alertsStatus({ HERO_ALERTS_ENABLED: "true" }).live, false, "switch alone is not enough")
  assert.equal(alertsStatus({ HERO_ALERTS_ENABLED: "true", SUPABASE_URL: "u", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", HERO_CERT_SECRET: "h" }).live, true)
})

test("a request needs 911 called first and keeps only a coarse cell", () => {
  assert.equal(prepareRequest({ lat: 42.1, lon: -75.9, called911: false }).ok, false)
  assert.equal(prepareRequest({ lat: 42.1, lon: -75.9, called911: "true" }).ok, false)
  assert.equal(prepareRequest({ lat: "x", lon: -75.9, called911: true }).ok, false)
  const made = prepareRequest({ lat: 42.123456, lon: -75.912345, called911: true }, NOW)
  assert.ok(made.ok)
  if (made.ok) {
    assert.equal(made.request.cell, "842:-1519")
    assert.equal(made.request.expiresAt - made.request.createdAt, REQUEST_TTL_MS)
    assert.ok(!JSON.stringify(made.request).includes("42.12"), "the exact location is not kept")
  }
})

test("availability is capped at 8 hours and needs a valid certificate", () => {
  const ok = prepareAvailability({ heroId: "h", lat: 42.1, lon: -75.9, hours: 24, certificateExpiresAt: CERT }, NOW)
  assert.equal(ok?.availableUntil, NOW + MAX_AVAILABILITY_MS)
  assert.equal(prepareAvailability({ heroId: "h", lat: 42.1, lon: -75.9, hours: 2, certificateExpiresAt: NOW - 1 }, NOW), null)
  assert.equal(prepareAvailability({ heroId: "h", lat: 42.1, lon: -75.9, hours: 0, certificateExpiresAt: CERT }, NOW), null)
})

test("matching includes neighbouring cells and skips paused, expired or uncertified Heroes", () => {
  const request: HeroRequest = { id: "r", cell: cellKey(cellOf(42.1, -75.9)!), createdAt: NOW, expiresAt: NOW + REQUEST_TTL_MS, called911: true }
  const heroes = [
    hero("same", 42.1, -75.9),
    hero("neighbour", 42.149, -75.9),
    hero("far", 43.0, -75.9),
    hero("paused", 42.1, -75.9, { paused: true }),
    hero("expired", 42.1, -75.9, { availableUntil: NOW - 1 }),
    hero("uncertified", 42.1, -75.9, { certificateExpiresAt: NOW - 1 }),
  ]
  assert.deepEqual(matchHeroes(request, heroes, NOW).map((h) => h.heroId), ["same", "neighbour"])
  assert.equal(nearbyCells(cellOf(42.1, -75.9)!).length, 9)
  const many = Array.from({ length: 9 }, (_, i) => hero(`h${i}`, 42.1, -75.9))
  assert.equal(matchHeroes(request, many, NOW).length, MAX_HEROES_PER_REQUEST)
  assert.deepEqual(matchHeroes({ ...request, expiresAt: NOW - 1 }, heroes, NOW), [], "expired requests match nobody")
})

test("a Hero only sees open nearby requests, and the alert reveals nothing about the person", () => {
  const me = hero("me", 42.1, -75.9)
  const open: HeroRequest = { id: "a", cell: me.cell, createdAt: NOW - 120_000, expiresAt: NOW + 60_000, called911: true }
  const old: HeroRequest = { ...open, id: "b", expiresAt: NOW - 1 }
  const far: HeroRequest = { ...open, id: "c", cell: cellKey(cellOf(45, -70)!) }
  assert.deepEqual(visibleRequests(me, [open, old, far], NOW).map((r) => r.id), ["a"])
  assert.deepEqual(visibleRequests({ ...me, paused: true }, [open], NOW), [])
  const text = alertText(open, NOW)
  assert.match(text, /911 has been called/)
  assert.match(text, /2 min ago/)
  assert.doesNotMatch(text, /overdose|recovery|relapse|addict|drug/i)
})
