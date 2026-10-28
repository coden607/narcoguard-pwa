import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  OFFLINE_MAP_MAX_TILES,
  OFFLINE_MAP_TILE_HOST,
  OFFLINE_MAP_ZOOM,
  offlineMapCacheLabel,
  offlineMapRegionFromPack,
  offlineMapTilesFor,
  tileXYFor,
  warmOfflineMapCache,
} from "../lib/offline-map-region"
import {
  buildOfflineResourcePack,
  readOfflineResourcePack,
  saveOfflineResourcePack,
  OFFLINE_RESOURCE_PACK_KEY,
} from "../lib/offline-resource-pack"
import type { KnownResource } from "../lib/resource-inventory"

const makeKnown = (index: number, lastSeenAt: string, coords?: { lat: number; lon: number }): KnownResource => ({
  key: `food|resource-${index}|100 main st`,
  zip: "13901",
  resource: {
    name: `Resource ${index}`,
    kind: "food",
    source: "OpenStreetMap contributors",
    address: "100 Main St",
    phone: "6075551212",
    ...(coords ? { lat: coords.lat, lon: coords.lon } : {}),
  },
  firstSeenAt: lastSeenAt,
  lastSeenAt,
  lastLookupAt: lastSeenAt,
  lastReturned: true,
})

test("Feature 60 maps coordinates to the standard slippy-map tile, clamped to the world", () => {
  assert.deepEqual(tileXYFor(42.3583, -71.0592, 15), { x: 9916, y: 12120 })
  assert.deepEqual(tileXYFor(-33.8688, 151.2093, 15), { x: 30147, y: 19663 })
  // Latitude clamps to the renderable range and longitude wraps at the antimeridian.
  assert.deepEqual(tileXYFor(84.9, -179.9, 15), { x: 9, y: 157 })
  assert.deepEqual(tileXYFor(-85.2, 180.1, 15), { x: 9, y: 32767 })
  assert.deepEqual(tileXYFor(Number.NaN, Number.NaN, 15), { x: 16384, y: 16384 })
  assert.equal(tileXYFor(42.3583, -71.0592).x, tileXYFor(42.3583, -71.0592, OFFLINE_MAP_ZOOM).x)
})

test("Feature 60 builds a bounded 3x3 tile block around one anchor", () => {
  const tiles = offlineMapTilesFor({ lat: 42.3583, lon: -71.0592 })
  assert.equal(tiles.length, 9)
  assert.ok(tiles.every((tile) => tile.url.startsWith(`${OFFLINE_MAP_TILE_HOST}/15/`)))
  assert.ok(tiles.some((tile) => tile.x === 9916 && tile.y === 12120))
  const xs = tiles.map((tile) => tile.x)
  const ys = tiles.map((tile) => tile.y)
  assert.equal(Math.max(...xs) - Math.min(...xs), 2)
  assert.equal(Math.max(...ys) - Math.min(...ys), 2)
  const sorted = [...tiles].sort((a, b) => a.x - b.x || a.y - b.y)
  assert.deepEqual(tiles, sorted)
  // Deterministic: same anchor, same set.
  assert.deepEqual(offlineMapTilesFor({ lat: 42.3583, lon: -71.0592 }), tiles)
})

test("Feature 60 has an explicit empty state when nothing has coordinates", () => {
  // No pack, no saved place.
  assert.equal(offlineMapRegionFromPack(null, null), null)
  // Empty pack, ZIP-only saved place (never geocoded on the phone).
  assert.equal(offlineMapRegionFromPack({ resources: [] }, { zip: "13901" }), null)
  // Pack rows without coordinates cannot anchor a region.
  const pack = buildOfflineResourcePack([makeKnown(1, "2026-10-27T10:00:00.000Z")], [], "2026-10-27T11:00:00.000Z")
  assert.equal(offlineMapRegionFromPack(pack, { zip: "13901" }), null)
})

test("Feature 60 anchors the region on the saved place and up to two distinct resources, bounded", () => {
  const saved = { lat: 42.36, lon: -71.06 }
  const inventory = [
    makeKnown(1, "2026-10-27T10:00:00.000Z", { lat: 42.35, lon: -71.05 }),
    makeKnown(2, "2026-10-27T10:05:00.000Z", { lat: 42.34, lon: -71.04 }),
    makeKnown(3, "2026-10-27T10:10:00.000Z", { lat: 42.33, lon: -71.03 }),
    // Duplicate of the saved place: must not add an anchor.
    makeKnown(4, "2026-10-27T10:15:00.000Z", { lat: 42.36, lon: -71.06 }),
  ]
  const pack = buildOfflineResourcePack(inventory, [], "2026-10-27T11:00:00.000Z")
  const region = offlineMapRegionFromPack(pack, saved)
  assert.ok(region)
  assert.equal(region.zoom, 15)
  assert.equal(region.anchors, 3)
  assert.ok(region.tiles.length <= OFFLINE_MAP_MAX_TILES)
  assert.ok(region.tiles.length > 9, "two nearby anchors should share most tiles")

  // Three far-apart anchors overflow the bound and are capped.
  const far = buildOfflineResourcePack(
    [
      makeKnown(1, "2026-10-27T10:00:00.000Z", { lat: 42.36, lon: -71.06 }),
      makeKnown(2, "2026-10-27T10:05:00.000Z", { lat: 40.71, lon: -74.0 }),
      makeKnown(3, "2026-10-27T10:10:00.000Z", { lat: 47.6, lon: -122.33 }),
    ],
    [],
    "2026-10-27T11:00:00.000Z",
  )
  const farRegion = offlineMapRegionFromPack(far, saved)
  assert.ok(farRegion)
  assert.equal(farRegion.anchors, 3)
  assert.equal(farRegion.tiles.length, OFFLINE_MAP_MAX_TILES)
})

test("Feature 60 carries public resource coordinates in the offline pack and sanitizes them", () => {
  const inventory = [
    makeKnown(1, "2026-10-27T10:00:00.000Z", { lat: 42.35, lon: -71.05 }),
    makeKnown(2, "2026-10-27T10:05:00.000Z"),
  ]
  const pack = buildOfflineResourcePack(inventory, [], "2026-10-27T11:00:00.000Z")
  const first = pack.resources.find((row) => row.name === "Resource 1")
  const second = pack.resources.find((row) => row.name === "Resource 2")
  assert.equal(first?.lat, 42.35)
  assert.equal(first?.lon, -71.05)
  assert.equal(second?.lat, undefined)

  const map = new Map<string, string>()
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value) },
  }
  saveOfflineResourcePack(storage, inventory, [], "2026-10-27T11:00:00.000Z")
  assert.ok(map.get(OFFLINE_RESOURCE_PACK_KEY)?.includes("\"lat\":42.35"))
  const readBack = readOfflineResourcePack(storage)
  assert.equal(readBack?.resources.find((row) => row.name === "Resource 1")?.lat, 42.35)

  // Non-finite or non-numeric coordinates are dropped, never trusted.
  const tampered = JSON.stringify({
    version: 1,
    generatedAt: "2026-10-27T11:00:00.000Z",
    resources: [
      { key: "k", zip: "13901", name: "Bad", kind: "food", source: "OSM", lastSeenAt: "2026-10-27T10:00:00.000Z", lat: "42.35", lon: Number.POSITIVE_INFINITY },
    ],
  })
  map.set(OFFLINE_RESOURCE_PACK_KEY, tampered)
  const cleaned = readOfflineResourcePack(storage)
  assert.equal(cleaned?.resources[0].lat, undefined)
  assert.equal(cleaned?.resources[0].lon, undefined)
})

test("Feature 60 labels cached tiles as stale without claiming current availability", () => {
  const now = Date.parse("2026-10-28T08:00:00.000Z")
  assert.equal(offlineMapCacheLabel("2026-10-28T07:30:00.000Z", now), "cached 30 min ago")
  assert.equal(offlineMapCacheLabel("2026-10-28T06:30:00.000Z", now), "cached 1 hr ago")
  assert.equal(offlineMapCacheLabel("2026-10-27T06:00:00.000Z", now), "cached 26 hr ago")
  assert.equal(offlineMapCacheLabel("2026-10-25T08:00:00.000Z", now), "cached 3 days ago")
  assert.equal(offlineMapCacheLabel("not a date", now), "cache age unknown")
  assert.equal(offlineMapCacheLabel("2026-10-28T09:00:00.000Z", now), "cache age unknown")
  assert.match(offlineMapCacheLabel("2026-10-25T08:00:00.000Z", now), /^cached /)
})

test("Feature 60 warms the tile cache fire-and-forget and never throws", async () => {
  const originalFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = (() => { calls += 1; return Promise.reject(new Error("offline")) }) as typeof fetch
  try {
    warmOfflineMapCache(null)
    assert.equal(calls, 0)
    const region = offlineMapRegionFromPack({ resources: [{ lat: 42.36, lon: -71.06 }] }, null)
    assert.ok(region)
    warmOfflineMapCache(region)
    assert.equal(calls, region.tiles.length)
    await new Promise((resolve) => setTimeout(resolve, 10))
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("Feature 60 service worker caches only tile requests in a bounded separate cache", () => {
  const worker = readFileSync("public/sw.js", "utf8")
  assert.match(worker, /narcoguard-shell-v14/)
  assert.match(worker, /narcoguard-map-tiles-v1/)
  assert.match(worker, /TILE_CACHE_MAX = 48/)
  assert.match(worker, /tile\.openstreetmap\.org/)
  assert.ok(worker.includes("/^\\/\\d+\\/\\d+\\/\\d+\\.png$/"))
  assert.match(worker, /key !== CACHE_NAME && key !== TILE_CACHE_NAME/)
  assert.match(worker, /\/offline\.html/)
  // The tile branch must not intercept same-origin app requests or API calls.
  assert.match(worker, /requestUrl\.pathname\.startsWith\("\/api\/"\)/)
})

test("Feature 60 offline page shows the saved region with explicit stale and empty states", () => {
  const offline = readFileSync("public/offline.html", "utf8")
  assert.match(offline, /Saved map region/)
  assert.match(offline, /may be out of date/)
  assert.match(offline, /not a claim about what is there now/)
  assert.match(offline, /No map region is saved on this device yet/)
  assert.match(offline, /No map tiles are saved for this area yet/)
  assert.match(offline, /not saved/)
  assert.match(offline, /tile\.openstreetmap\.org/)
  assert.match(offline, /narcoguard_saved_place_v1/)
  assert.match(offline, /grid-template-columns: repeat\(3, 1fr\)/)
  // Existing saved-resources wording and emergency content are untouched.
  assert.match(offline, /Saved resources from recent lookups/)
  assert.match(offline, /href="tel:911"/)
  assert.doesNotMatch(offline, />Open now</)
})
