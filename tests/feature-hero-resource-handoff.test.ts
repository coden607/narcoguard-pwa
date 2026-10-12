import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  cleanHeroContact,
  openHeroContact,
  sealHeroContact,
} from "../lib/hero-handoff"

test("Feature 12 accepts only bounded user-approved contact methods", () => {
  assert.deepEqual(cleanHeroContact({ method: "text", value: "607 555 1212" }), {
    method: "text",
    value: "607 555 1212",
  })
  assert.deepEqual(cleanHeroContact({ method: "community-handle", value: "helper_607" }), {
    method: "community-handle",
    value: "helper_607",
  })
  assert.equal(cleanHeroContact({ method: "profile", value: "anything" }), null)
  assert.equal(cleanHeroContact({ method: "email", value: "not-an-email" }), null)
  assert.equal(cleanHeroContact({ method: "community-handle", value: "x" }), null)
})

test("Feature 12 contact handoff is encrypted and requires the same server secret", () => {
  const sealed = sealHeroContact({ method: "email", value: "user@example.com" }, "secret-one")
  assert.ok(sealed)
  assert.doesNotMatch(sealed ?? "", /user@example\.com/)
  assert.deepEqual(openHeroContact(sealed, "secret-one"), {
    method: "email",
    value: "user@example.com",
  })
  assert.equal(openHeroContact(sealed, "secret-two"), null)
})

test("Feature 12 API reveals contact only in accepted Hero responses and clears it", () => {
  const api = readFileSync("app/api/heroes/alerts/route.ts", "utf8")
  const request = readFileSync("components/hero/hero-help-request.tsx", "utf8")
  const responder = readFileSync("components/hero/hero-availability-panel.tsx", "utf8")
  const migration = readFileSync("supabase/migrations/20261012174500_hero_resource_contact_handoff.sql", "utf8")

  assert.match(api, /shareContact/)
  assert.match(api, /sealHeroContact/)
  assert.match(api, /openHeroContact/)
  assert.match(api, /item\.kind === "resource" \? openHeroContact/)
  assert.ok((api.match(/contact_ciphertext: null/g) ?? []).length >= 2)
  assert.doesNotMatch(api, /community_profiles.*contact|contact.*community_profiles/)
  assert.match(request, /Share one contact method only with the Hero who accepts/)
  assert.match(request, /No profile, recovery history, email, phone number, or Community handle is shared unless you explicitly enter/)
  assert.match(responder, /Requester-approved contact/)
  assert.match(responder, /not pulled from the requester.*profile/i)
  assert.match(migration, /add column if not exists contact_ciphertext text/)
})
