import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  CARD_TYPE,
  LIMITS,
  clearOffline,
  isValidPhone,
  loadOffline,
  saveOffline,
  validateCard,
  validateEnvelope,
} from "../lib/emergency-card"

test("valid card normalizes and applies defaults", () => {
  const r = validateCard({
    medications: [{ name: "  Naloxone  ", dose: "4mg", schedule: "as needed" }],
    allergies: [" penicillin "],
    conditions: [],
    contacts: [{ name: "Sam", relationship: "partner", phone: "+1 (555) 123-4567" }],
    notes: "carry in bag",
  })
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(r.card.medications, [{ name: "Naloxone", dose: "4mg", schedule: "as needed" }])
  assert.deepEqual(r.card.allergies, ["penicillin"])
  assert.equal(r.card.contacts[0].phone, "+1 (555) 123-4567")
})

test("empty card is valid (nothing recorded is a legitimate state)", () => {
  const r = validateCard({})
  assert.equal(r.ok, true)
  if (!r.ok) return
  assert.deepEqual(r.card.medications, [])
  assert.deepEqual(r.card.allergies, [])
  assert.deepEqual(r.card.conditions, [])
  assert.deepEqual(r.card.contacts, [])
  assert.equal("notes" in r.card, false)
})

test("medication requires a name", () => {
  const r = validateCard({ medications: [{ dose: "4mg" }] })
  assert.equal(r.ok, false)
  if (r.ok) return
  assert.ok(r.errors.some((e) => e.includes("medications[0].name")))
})

test("contact requires a valid phone", () => {
  assert.equal(isValidPhone("+1 (555) 123-4567"), true)
  assert.equal(isValidPhone("5551234567"), true)
  assert.equal(isValidPhone("call sam"), false)
  assert.equal(isValidPhone("12"), false)
  const r = validateCard({ contacts: [{ name: "Sam", phone: "call sam" }] })
  assert.equal(r.ok, false)
})

test("caps are enforced", () => {
  const r = validateCard({
    medications: Array.from({ length: LIMITS.medications + 1 }, (_, i) => ({ name: `m${i}` })),
  })
  assert.equal(r.ok, false)
  const long = validateCard({ allergies: ["x".repeat(LIMITS.allergy + 1)] })
  assert.equal(long.ok, false)
})

test("envelope validates type, version, ciphertext bounds", () => {
  const good = validateEnvelope({ type: CARD_TYPE, version: 1, ciphertext: "abc", updatedAt: new Date().toISOString() })
  assert.ok(good)
  assert.equal(validateEnvelope({ type: "other/v1", version: 1, ciphertext: "abc" }), null)
  assert.equal(validateEnvelope({ type: CARD_TYPE, version: 0, ciphertext: "abc" }), null)
  assert.equal(validateEnvelope({ type: CARD_TYPE, version: 1, ciphertext: "" }), null)
  assert.equal(validateEnvelope({ type: CARD_TYPE, version: 1, ciphertext: "x".repeat(100_001) }), null)
  assert.equal(validateEnvelope("nope"), null)
})

test("offline round-trip stores only a valid envelope", () => {
  // node has no localStorage: helpers fail soft
  assert.equal(saveOffline({ type: CARD_TYPE, version: 1, ciphertext: "abc", updatedAt: new Date(0).toISOString() }), false)
  assert.equal(loadOffline(), null)
  clearOffline()
})

test("migration keeps contents ciphertext-only with own-row RLS", () => {
  const sql = readFileSync("supabase/migrations/20261014035000_emergency_card.sql", "utf8")
  assert.match(sql, /create table if not exists public\.emergency_cards/)
  assert.match(sql, /sealed jsonb not null/)
  // Envelope check requires the type tag and positive version.
  assert.match(sql, /sealed ->> 'type' = 'emergency-card\/v1'/)
  // No plaintext columns for medical data exist anywhere in the table.
  const body = sql.slice(sql.indexOf("create table"), sql.indexOf("alter table"))
  for (const forbidden of ["medication", "allerg", "condition", "contact", "phone", "notes"]) {
    assert.ok(!new RegExp(`\\b${forbidden}\\b`, "i").test(body), `plaintext column leak: ${forbidden}`)
  }
  assert.match(sql, /enable row level security/)
  assert.match(sql, /user_id = \(select auth\.uid\(\)\)/)
})
