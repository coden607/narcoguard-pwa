import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  inventoryFreshness,
  knownResourcesFor,
  readKnownResources,
  rememberKnownResources,
  RESOURCE_INVENTORY_KEY,
} from "../lib/resource-inventory"

const storage = () => {
  const map = new Map<string,string>()
  return {
    getItem: (key:string) => map.get(key) ?? null,
    setItem: (key:string, value:string) => { map.set(key, value) },
  }
}

test("known resources are remembered by ZIP and resource kind", () => {
  const store = storage()
  const seenAt = "2026-10-12T08:00:00.000Z"
  const rows = rememberKnownResources(store, "13850", [{
    name: "Example Community Pantry",
    kind: "food",
    address: "100 Main St",
    source: "OpenStreetMap contributors",
    hours: "Mo-Fr 09:00-17:00",
  }], seenAt)

  assert.equal(rows.length, 1)
  assert.equal(readKnownResources(store).length, 1)
  assert.equal(knownResourcesFor(rows, "13850", ["food"]).length, 1)
  assert.equal(knownResourcesFor(rows, "13901", ["food"]).length, 0)
  assert.ok(store.getItem(RESOURCE_INVENTORY_KEY))
})

test("seeing the same resource again updates last-seen but preserves first-seen", () => {
  const store = storage()
  const resource = {
    name: "Example Shower",
    kind: "showers" as const,
    address: "1 Water St",
    source: "OpenStreetMap contributors" as const,
  }
  rememberKnownResources(store, "13850", [resource], "2026-10-12T08:00:00.000Z")
  const rows = rememberKnownResources(store, "13850", [resource], "2026-10-12T09:00:00.000Z")

  assert.equal(rows[0].firstSeenAt, "2026-10-12T08:00:00.000Z")
  assert.equal(rows[0].lastSeenAt, "2026-10-12T09:00:00.000Z")
})

test("inventory freshness is explicit and degrades with age", () => {
  const now = new Date("2026-10-12T12:00:00.000Z")
  assert.equal(inventoryFreshness("2026-10-12T11:45:00.000Z", now), "fresh")
  assert.equal(inventoryFreshness("2026-10-12T05:00:00.000Z", now), "aging")
  assert.equal(inventoryFreshness("2026-10-10T12:00:00.000Z", now), "stale")
})
