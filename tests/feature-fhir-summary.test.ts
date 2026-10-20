import assert from "node:assert/strict"
import { test } from "node:test"
import { normalizeAppointments, normalizeConditions, normalizePatient, normalizeVitals } from "../lib/health/fhir-summary"

test("FHIR normalizers return only curated patient-facing fields", () => {
  assert.deepEqual(normalizePatient({
    resourceType: "Patient",
    name: [{ given: ["Alex"], family: "Example" }],
    birthDate: "2000-01-01",
    telecom: [{ value: "secret-phone" }],
    address: [{ line: ["secret-address"] }],
  }), { name: "Alex Example", birthDate: "2000-01-01" })

  assert.deepEqual(normalizeVitals({
    entry: [{ resource: { id: "v1", code: { text: "Heart rate" }, valueQuantity: { value: 72, unit: "beats/min" }, effectiveDateTime: "2026-10-20T10:00:00Z", note: [{ text: "private note" }] } }],
  }), [{ id: "v1", name: "Heart rate", value: 72, unit: "beats/min", at: "2026-10-20T10:00:00Z" }])

  assert.deepEqual(normalizeConditions({ entry: [{ resource: { id: "c1", code: { text: "Example condition" }, note: [{ text: "private" }] } }] }), [{ id: "c1", name: "Example condition" }])
  assert.deepEqual(normalizeAppointments({ entry: [{ resource: { id: "a1", status: "booked", start: "2026-11-01T12:00:00Z", description: "Primary care", participant: [{ actor: { display: "Private clinician" } }] } }] }), [{ id: "a1", status: "booked", start: "2026-11-01T12:00:00Z", description: "Primary care" }])
})
