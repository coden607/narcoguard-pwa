import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  MAX_AVAILABILITY_MS,
  MAX_HEROES_PER_REQUEST,
  REQUEST_TTL_MS,
  RESOURCE_REQUEST_TTL_MS,
  alertText,
  alertsStatus,
  cellCenter,
  cellKey,
  cellOf,
  matchHeroes,
  nearbyCells,
  prepareAvailability,
  prepareRequest,
  prepareResourceRequest,
  sanitizeResources,
  visibleRequests,
  type HeroAvailability,
  type HeroRequest,
} from "../lib/hero-alerts"

const NOW = 1_800_000_000_000
const CERT = NOW + 365 * 86_400_000
const hero = (id: string, lat: number, lon: number, extra: Partial<HeroAvailability> = {}): HeroAvailability =>
  ({
    heroId: id,
    cell: cellKey(cellOf(lat, lon)!),
    availableUntil: NOW + 3_600_000,
    paused: false,
    certificateExpiresAt: CERT,
    emergencyReady: true,
    naloxoneOnCall: true,
    resources: ["naloxone"],
    ...extra,
  })

test("alerts stay off unless explicitly switched on and fully configured", () => {
  assert.equal(alertsStatus({}).live, false)
  assert.equal(alertsStatus({ HERO_ALERTS_ENABLED: "yes" }).live, false)
  assert.equal(alertsStatus({ HERO_ALERTS_ENABLED: "true" }).live, false, "switch alone is not enough")
  assert.equal(alertsStatus({ HERO_ALERTS_ENABLED: "true", SUPABASE_URL: "u", SUPABASE_ANON_KEY: "a", SUPABASE_SERVICE_ROLE_KEY: "s", HERO_CERT_SECRET: "h" }).live, true)
})

test("an emergency request needs 911 called first and keeps only a coarse cell", () => {
  assert.equal(prepareRequest({ lat: 42.1, lon: -75.9, called911: false }).ok, false)
  assert.equal(prepareRequest({ lat: 42.1, lon: -75.9, called911: "true" }).ok, false)
  assert.equal(prepareRequest({ lat: "x", lon: -75.9, called911: true }).ok, false)
  const made = prepareRequest({ lat: 42.123456, lon: -75.912345, called911: true }, NOW)
  assert.ok(made.ok)
  if (made.ok) {
    assert.equal(made.request.cell, "842:-1519")
    assert.equal(made.request.kind, "emergency")
    assert.equal(made.request.expiresAt - made.request.createdAt, REQUEST_TTL_MS)
    assert.ok(!JSON.stringify(made.request).includes("42.12"), "the exact location is not kept")
  }
})

test("a practical-needs request does not imply emergency and can request Narcan, food, water or clothing", () => {
  for (const kind of ["naloxone", "food", "water", "clothing"] as const) {
    const made = prepareResourceRequest({ lat: 42.1, lon: -75.9, resourceKind: kind }, NOW)
    assert.ok(made.ok)
    if (made.ok) {
      assert.equal(made.request.kind, "resource")
      assert.equal(made.request.called911, false)
      assert.equal(made.request.resourceKind, kind)
      assert.equal(made.request.expiresAt - made.request.createdAt, RESOURCE_REQUEST_TTL_MS)
    }
  }
  assert.equal(prepareResourceRequest({ lat: 42.1, lon: -75.9, resourceKind: "cash" }, NOW).ok, false)
})

test("availability is capped at 8 hours and emergency on-call requires naloxone", () => {
  const ok = prepareAvailability({
    heroId: "h", lat: 42.1, lon: -75.9, hours: 24, certificateExpiresAt: CERT,
    emergencyReady: true, naloxoneOnCall: true, resources: ["food", "water", "food"],
  }, NOW)
  assert.equal(ok?.availableUntil, NOW + MAX_AVAILABILITY_MS)
  assert.deepEqual(ok?.resources, ["food", "water"])
  assert.equal(prepareAvailability({
    heroId: "h", lat: 42.1, lon: -75.9, hours: 2, certificateExpiresAt: CERT,
    emergencyReady: true, naloxoneOnCall: false, resources: ["food"],
  }, NOW), null)
  assert.equal(prepareAvailability({
    heroId: "h", lat: 42.1, lon: -75.9, hours: 2, certificateExpiresAt: CERT,
    emergencyReady: false, naloxoneOnCall: false, resources: [],
  }, NOW), null)
  assert.equal(prepareAvailability({ heroId: "h", lat: 42.1, lon: -75.9, hours: 2, certificateExpiresAt: NOW - 1 }, NOW), null)
})

test("resource sanitizing only accepts known capabilities", () => {
  assert.deepEqual(sanitizeResources(["food", "water", "cash", "food", 3]), ["food", "water"])
})

test("matching filters by emergency readiness or requested resource", () => {
  const emergency: HeroRequest = {
    id: "r", cell: cellKey(cellOf(42.1, -75.9)!), createdAt: NOW, expiresAt: NOW + REQUEST_TTL_MS,
    kind: "emergency", called911: true, status: "open",
  }
  const food: HeroRequest = {
    id: "f", cell: emergency.cell, createdAt: NOW, expiresAt: NOW + RESOURCE_REQUEST_TTL_MS,
    kind: "resource", called911: false, resourceKind: "food", status: "open",
  }
  const heroes = [
    hero("emergency", 42.1, -75.9, { resources: [] }),
    hero("food", 42.1, -75.9, { emergencyReady: false, naloxoneOnCall: false, resources: ["food"] }),
    hero("far", 43.0, -75.9, { resources: ["food"] }),
    hero("paused", 42.1, -75.9, { paused: true, resources: ["food"] }),
  ]
  assert.deepEqual(matchHeroes(emergency, heroes, NOW).map((h) => h.heroId), ["emergency"])
  assert.deepEqual(matchHeroes(food, heroes, NOW).map((h) => h.heroId), ["food"])
  assert.equal(nearbyCells(cellOf(42.1, -75.9)!).length, 9)
  const many = Array.from({ length: 9 }, (_, i) => hero(`h${i}`, 42.1, -75.9))
  assert.equal(matchHeroes(emergency, many, NOW).length, MAX_HEROES_PER_REQUEST)
})

test("a Hero sees only open nearby requests they can actually satisfy", () => {
  const me = hero("me", 42.1, -75.9, { resources: ["food"] })
  const emergency: HeroRequest = { id: "a", cell: me.cell, createdAt: NOW - 120_000, expiresAt: NOW + 60_000, kind: "emergency", called911: true, status: "open" }
  const food: HeroRequest = { id: "b", cell: me.cell, createdAt: NOW, expiresAt: NOW + 60_000, kind: "resource", called911: false, resourceKind: "food", status: "open" }
  const water: HeroRequest = { ...food, id: "c", resourceKind: "water" }
  const completed: HeroRequest = { ...food, id: "d", status: "completed" }
  assert.deepEqual(visibleRequests(me, [emergency, food, water, completed], NOW).map((r) => r.id), ["a", "b"])
  assert.deepEqual(visibleRequests({ ...me, paused: true }, [emergency], NOW), [])
  assert.match(alertText(emergency, NOW), /911 has been called/)
  assert.match(alertText(food, NOW), /Food/)
  assert.doesNotMatch(alertText(food, NOW), /overdose|recovery|relapse|addict|drug/i)
})

test("map cells expose only a coarse center, not the original point", () => {
  const cell = cellKey(cellOf(42.123456, -75.912345)!)
  const center = cellCenter(cell)
  assert.ok(center)
  assert.notEqual(center?.lat, 42.123456)
  assert.notEqual(center?.lon, -75.912345)
})
