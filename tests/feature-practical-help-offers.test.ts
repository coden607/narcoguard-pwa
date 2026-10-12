import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  MAX_PRACTICAL_OFFER_MS,
  preparePracticalHelpOffer,
  sanitizePracticalHelpKinds,
} from "../lib/hero-practical-offers"

test("Feature 11 practical offers exclude emergency-only naloxone and cap duration", () => {
  const now = Date.UTC(2026, 9, 12, 12, 0, 0)
  const offer = preparePracticalHelpOffer({
    helperId: "user-1",
    lat: 42.0987,
    lon: -75.9179,
    hours: 99,
    resources: ["food", "ride", "naloxone", "food"],
  }, now)

  assert.ok(offer)
  assert.deepEqual(offer.resources, ["food", "ride"])
  assert.equal(offer.availableUntil, now + MAX_PRACTICAL_OFFER_MS)
  assert.match(offer.cell, /^-?\d{1,5}:-?\d{1,5}$/)
  assert.equal("lat" in offer, false)
  assert.equal("lon" in offer, false)
  assert.deepEqual(sanitizePracticalHelpKinds(["naloxone", "food", "shower"]), ["food", "shower"])
})

test("Feature 11 requires a category, duration and valid location", () => {
  assert.equal(preparePracticalHelpOffer({
    helperId: "user-1",
    lat: 42,
    lon: -76,
    hours: 2,
    resources: [],
  }), null)
  assert.equal(preparePracticalHelpOffer({
    helperId: "user-1",
    lat: 999,
    lon: -76,
    hours: 2,
    resources: ["food"],
  }), null)
})

test("Feature 11 storage and API are separate from emergency Hero certification", () => {
  const migration = readFileSync("supabase/migrations/20261012170000_hero_practical_help_offers.sql", "utf8")
  const api = readFileSync("app/api/heroes/practical-offers/route.ts", "utf8")
  const panel = readFileSync("components/hero/practical-help-offer-panel.tsx", "utf8")
  const mapApi = readFileSync("app/api/heroes/map/route.ts", "utf8")
  const map = readFileSync("components/hero/hero-map.tsx", "utf8")

  assert.match(migration, /create table if not exists public\.hero_practical_offers/)
  assert.doesNotMatch(migration, /'naloxone'/)
  assert.match(migration, /revoke all .* authenticated/)
  assert.match(api, /Sign in to publish a practical-help offer/)
  assert.doesNotMatch(api, /enrolledCertificate|verifyCertificate|hero_certifications/)
  assert.match(api, /does not enroll or certify you as an emergency Hero/i)
  assert.match(panel, /separate from emergency Hero certification/i)
  assert.match(panel, /Exact coordinates are not stored/i)
  assert.match(mapApi, /practicalHelpers/)
  assert.match(mapApi, /practicalOnline/)
  assert.match(map, /Certified Heroes available/)
  assert.match(map, /Practical helpers offering/)
})
