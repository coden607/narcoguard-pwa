import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { normalizeAppointments, normalizeConditions, normalizeEncounters, normalizePatient, normalizeVitals } from "../lib/health/fhir-summary"

const bundle = (...resources: Record<string, unknown>[]) => ({ entry: resources.map(resource => ({ resource, search: { mode: "match" } })) })

test("FHIR normalizers return only curated patient-facing fields", () => {
  assert.deepEqual(normalizePatient({
    resourceType: "Patient",
    name: [{ given: ["Alex"], family: "Example" }],
    birthDate: "2000-01-01",
    telecom: [{ value: "secret-phone" }],
    address: [{ line: ["secret-address"] }],
  }), { name: "Alex Example", birthDate: "2000-01-01" })

  assert.deepEqual(normalizeVitals(bundle({ resourceType: "Observation", status: "final", id: "v1", code: { text: "Heart rate" }, valueQuantity: { value: 72, unit: "beats/min" }, effectiveDateTime: "2026-10-20T10:00:00Z", note: [{ text: "private note" }] })),
    [{ id: "v1", name: "Heart rate", value: "72", unit: "beats/min", at: "2026-10-20T10:00:00Z" }])

  assert.deepEqual(normalizeConditions(bundle({ resourceType: "Condition", id: "c1", code: { text: "Example condition" }, note: [{ text: "private" }] })), [{ id: "c1", name: "Example condition" }])
  assert.deepEqual(normalizeAppointments(bundle({ resourceType: "Appointment", id: "a1", status: "booked", start: "2026-11-01T12:00:00Z", description: "Primary care", participant: [{ actor: { display: "Private clinician" } }] })), [{ id: "a1", status: "booked", start: "2026-11-01T12:00:00Z", description: "Primary care" }])
})

test("FHIR normalizers drop invalidated, foreign and outcome entries", () => {
  assert.deepEqual(normalizeConditions(bundle(
    { resourceType: "Condition", id: "c1", code: { text: "Refuted" }, verificationStatus: { coding: [{ code: "refuted" }] } },
    { resourceType: "Condition", id: "c2", code: { text: "Error" }, verificationStatus: { coding: [{ code: "entered-in-error" }] } },
    { resourceType: "OperationOutcome", id: "o1", code: { text: "Not a condition" } },
    { resourceType: "Condition", id: "c3", code: { text: "Confirmed" }, verificationStatus: { coding: [{ code: "confirmed" }] } },
  )), [{ id: "c3", name: "Confirmed" }])

  assert.deepEqual(normalizeVitals(bundle(
    { resourceType: "Observation", status: "entered-in-error", id: "v1", code: { text: "Heart rate" }, valueQuantity: { value: 999 } },
    { resourceType: "Observation", status: "final", id: "bp", code: { text: "Blood pressure" }, component: [
      { code: { coding: [{ code: "8480-6" }] }, valueQuantity: { value: 120, unit: "mm[Hg]" } },
      { code: { coding: [{ code: "8462-4" }] }, valueQuantity: { value: 80, unit: "mm[Hg]" } },
    ] },
  )), [{ id: "bp", name: "Blood pressure", at: null, value: "120/80", unit: "mm[Hg]" }])

  assert.deepEqual(normalizeEncounters({ entry: [{ resource: { resourceType: "Encounter", id: "e1", status: "finished" }, search: { mode: "include" } }] }), [])

  assert.equal(normalizePatient({ name: [{ use: "old", text: "Former Name" }, { use: "official", given: ["Current"], family: "Name" }] })?.name, "Current Name")
})

test("UHS routes bind records to the signed-in account and clear cookies on their scoped path", async () => {
  const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8")
  const summary = await read("app/api/health/uhs/summary/route.ts")
  assert.match(summary, /user\.id !== session\.userId/)
  assert.match(summary, /Promise\.allSettled/)
  assert.match(summary, /status === 401 \|\| read\.reason\.status === 403/)
  const callback = await read("app/api/health/uhs/callback/route.ts")
  assert.match(callback, /userId: user\.id/)
  assert.match(callback, /token_type/)
  assert.doesNotMatch(callback, /store\.delete\(/)
  const start = await read("app/api/health/uhs/start/route.ts")
  assert.match(start, /hasUsableUhsSecret\(process\.env\.UHS_SMART_SESSION_SECRET\)/)
  const disconnect = await read("app/api/health/uhs/disconnect/route.ts")
  assert.match(disconnect, /clearUhsCookies\(await cookies\(\)\)/)
  const oauth = await read("lib/health/uhs-oauth.ts")
  assert.match(oauth, /path: UHS_COOKIE_PATH, maxAge: 0/)
})
