import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  activeResourceVerification,
  readResourceVerifications,
  saveResourceVerification,
  verificationLabel,
} from "../lib/resource-verification"

const storage = () => {
  const map = new Map<string,string>()
  return {
    getItem: (key:string) => map.get(key) ?? null,
    setItem: (key:string, value:string) => { map.set(key, value) },
  }
}

const resource = {
  name: "Example Pantry",
  kind: "food" as const,
  address: "1 Main St",
  phone: "6075551111",
  source: "OpenStreetMap contributors" as const,
}

test("resource verification is local, expiring, and separate from directory data", () => {
  const store = storage()
  const now = new Date("2026-10-12T12:00:00.000Z")
  const rows = saveResourceVerification(store, resource, "confirmed-open", "phone", "answering today", now)
  assert.equal(rows.length, 1)
  assert.equal(readResourceVerifications(store).length, 1)

  const active = activeResourceVerification(rows, resource, new Date("2026-10-12T13:00:00.000Z"))
  assert.ok(active)
  assert.match(verificationLabel(active!), /You confirmed/)
  assert.equal(active?.note, "answering today")

  assert.equal(activeResourceVerification(rows, resource, new Date("2026-10-13T01:00:01.000Z")), null)
})

test("verification notes are capped and cannot imply permanent freshness", () => {
  const store = storage()
  const rows = saveResourceVerification(store, resource, "could-not-confirm", "website", "x".repeat(400), new Date("2026-10-12T12:00:00.000Z"))
  assert.equal(rows[0].note.length, 240)
  assert.match(verificationLabel(rows[0]), /could not verify/i)
})
