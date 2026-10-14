import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  buildOfflineResourcePack,
  offlineResourceAgeLabel,
  OFFLINE_RESOURCE_PACK_KEY,
  OFFLINE_RESOURCE_PACK_MAX,
  readOfflineResourcePack,
  saveOfflineResourcePack,
} from "../lib/offline-resource-pack"
import type { KnownResource } from "../lib/resource-inventory"
import type { ResourceFeedback } from "../lib/resource-personalization"

const makeKnown = (index: number, lastSeenAt: string): KnownResource => ({
  key: `food|resource-${index}|100 main st`,
  zip: "13901",
  resource: {
    name: `Resource ${index}`,
    kind: "food",
    source: "OpenStreetMap contributors",
    address: "100 Main St",
    phone: "6075551212",
    hours: "Mo-Fr 09:00-17:00",
    website: "https://example.org",
  },
  firstSeenAt: lastSeenAt,
  lastSeenAt,
  lastLookupAt: lastSeenAt,
  lastReturned: true,
})

test("Feature 16 builds a bounded offline pack and prioritizes resources marked worked", () => {
  const inventory = Array.from({ length: 30 }, (_, index) =>
    makeKnown(index, new Date(Date.UTC(2026, 9, 13, 10, index)).toISOString()),
  )
  const feedback: ResourceFeedback[] = [
    { key: inventory[0].key, value: "worked", updatedAt: "2026-10-13T11:00:00.000Z" },
    { key: inventory[29].key, value: "closed", updatedAt: "2026-10-13T11:00:00.000Z" },
  ]

  const pack = buildOfflineResourcePack(inventory, feedback, "2026-10-13T11:10:00.000Z")
  assert.equal(pack.resources.length, OFFLINE_RESOURCE_PACK_MAX)
  assert.equal(pack.resources[0].key, inventory[0].key)
  assert.equal(pack.resources[0].workedBefore, true)
  assert.ok(!pack.resources.some((row) => row.key === inventory[29].key))
})

test("Feature 16 persists and sanitizes the local pack", () => {
  const map = new Map<string, string>()
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value) },
  }
  const inventory = [makeKnown(1, "2026-10-13T10:00:00.000Z")]
  saveOfflineResourcePack(storage, inventory, [], "2026-10-13T11:00:00.000Z")

  assert.ok(storage.getItem(OFFLINE_RESOURCE_PACK_KEY))
  const pack = readOfflineResourcePack(storage)
  assert.ok(pack)
  assert.equal(pack.resources[0].name, "Resource 1")
  assert.equal(pack.resources[0].zip, "13901")
})

test("Feature 16 exposes explicit age labels instead of online/open-now claims", () => {
  const now = Date.parse("2026-10-13T12:00:00.000Z")
  assert.equal(offlineResourceAgeLabel("2026-10-13T11:30:00.000Z", now), "30 min old")
  assert.equal(offlineResourceAgeLabel("2026-10-12T10:00:00.000Z", now), "26 hr old")
  assert.equal(offlineResourceAgeLabel("2026-10-10T12:00:00.000Z", now), "3 days old")

  const offline = readFileSync("public/offline.html", "utf8")
  assert.match(offline, /Saved resources from recent lookups/)
  assert.match(offline, /They may be stale, closed, moved, or unavailable/)
  assert.match(offline, /not a claim that a place is open now/)
  assert.match(offline, /narcoguard_offline_resource_pack_v1/)
  assert.doesNotMatch(offline, />Open now</)
})

test("Feature 16 refreshes the pack from known inventory and feedback", () => {
  const component = readFileSync("components/guardian/maslow-resource-automation.tsx", "utf8")
  const worker = readFileSync("public/sw.js", "utf8")

  assert.match(component, /saveOfflineResourcePack/)
  assert.match(component, /nextInventory/)
  assert.match(component, /nextFeedback/)
  assert.match(worker, /narcoguard-shell-v12/)
  assert.match(worker, /\/offline\.html/)
})
