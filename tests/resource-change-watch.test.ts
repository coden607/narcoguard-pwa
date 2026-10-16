import { strict as assert } from "node:assert"
import { test } from "node:test"
import { detectResourceChanges, readResourceChangeWatches, setResourceChangeWatch } from "../lib/resource-change-watch"
import type { KnownResource } from "../lib/resource-inventory"

const storage = () => {
  const map = new Map<string,string>()
  return {
    getItem: (key:string) => map.get(key) ?? null,
    setItem: (key:string, value:string) => { map.set(key, value) },
  }
}

const known = (overrides: Partial<KnownResource> = {}): KnownResource => ({
  key: "food|example pantry|1 main st",
  zip: "13850",
  resource: {
    name: "Example Pantry",
    kind: "food",
    address: "1 Main St",
    phone: "6075551111",
    hours: "Mo-Fr 09:00-17:00",
    source: "OpenStreetMap contributors",
  },
  firstSeenAt: "2026-10-10T12:00:00.000Z",
  lastSeenAt: "2026-10-12T11:30:00.000Z",
  lastLookupAt: "2026-10-12T11:30:00.000Z",
  lastReturned: true,
  ...overrides,
})

test("resource listing watches are local and toggleable", () => {
  const store = storage()
  assert.deepEqual(readResourceChangeWatches(store), [])
  assert.deepEqual(setResourceChangeWatch(store, known().key, true), [known().key])
  assert.deepEqual(setResourceChangeWatch(store, known().key, false), [])
})

test("material directory changes are reported without claiming provider confirmation", () => {
  const row = known()
  const changes = detectResourceChanges({
    previous: [row],
    latest: [{ ...row.resource, phone: "6075552222", hours: "Mo-Fr 10:00-18:00" }],
    watchedKeys: [row.key],
    zip: "13850",
    fetchedAt: "2026-10-12T12:00:00.000Z",
  })
  assert.equal(changes.length, 1)
  assert.equal(changes[0].type, "changed")
  assert.deepEqual(changes[0].fields.sort(), ["hours", "phone"])
})

test("absence from one lookup is not called closed or unavailable", () => {
  const row = known()
  const changes = detectResourceChanges({
    previous: [row],
    latest: [],
    watchedKeys: [row.key],
    zip: "13850",
    fetchedAt: "2026-10-12T12:00:00.000Z",
  })
  assert.equal(changes[0].type, "not-returned")
  assert.match(changes[0].message, /does not prove it closed or became unavailable/i)
})

test("a watched listing can be reported as returned after a prior missed lookup", () => {
  const row = known({ lastReturned: false })
  const changes = detectResourceChanges({
    previous: [row],
    latest: [row.resource],
    watchedKeys: [row.key],
    zip: "13850",
    fetchedAt: "2026-10-12T12:00:00.000Z",
  })
  assert.ok(changes.some((change) => change.type === "returned"))
})
