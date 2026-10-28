import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  OFFLINE_MAP_MAX_TILES,
  OFFLINE_MAP_ZOOM,
  offlineMapCacheLabel,
  offlineMapRegionFromPack,
  offlineMapTilesFor,
  tileXYFor,
} from "../lib/offline-map-region"
import { OFFLINE_MAP_CACHE_MAX, OFFLINE_MAP_CACHE_NAME, clearOfflineMapCache, warmOfflineMapCache } from "../lib/offline-map-cache"
import {
  OFFLINE_MAP_CONSENT_TEXT,
  OFFLINE_MAP_OPTIN_KEY,
  clearOfflineMapOptIn,
  parseTileProvider,
  readOfflineMapOptIn,
  saveOfflineMapOptIn,
  tileUrl,
} from "../lib/offline-map-config"
import {
  buildOfflineResourcePack,
  readOfflineResourcePack,
  saveOfflineResourcePack,
  OFFLINE_RESOURCE_PACK_KEY,
} from "../lib/offline-resource-pack"
import type { KnownResource } from "../lib/resource-inventory"

const TEMPLATE = "https://tiles.example.test/v1/{z}/{x}/{y}.png"
const ATTRIBUTION = "© Example Maps, © OpenStreetMap contributors"
const PROVIDER = parseTileProvider(TEMPLATE, ATTRIBUTION)!

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
  const tiles = offlineMapTilesFor({ lat: 42.3583, lon: -71.0592 }, TEMPLATE)
  assert.equal(tiles.length, 9)
  assert.ok(tiles.every((tile) => tile.url === `https://tiles.example.test/v1/15/${tile.x}/${tile.y}.png`))
  assert.ok(tiles.some((tile) => tile.x === 9916 && tile.y === 12120))
  const xs = tiles.map((tile) => tile.x)
  const ys = tiles.map((tile) => tile.y)
  assert.equal(Math.max(...xs) - Math.min(...xs), 2)
  assert.equal(Math.max(...ys) - Math.min(...ys), 2)
  const sorted = [...tiles].sort((a, b) => a.x - b.x || a.y - b.y)
  assert.deepEqual(tiles, sorted)
  // Deterministic: same anchor, same set.
  assert.deepEqual(offlineMapTilesFor({ lat: 42.3583, lon: -71.0592 }, TEMPLATE), tiles)
})

test("Feature 60 has an explicit empty state when nothing has coordinates", () => {
  // No pack, no saved place.
  assert.equal(offlineMapRegionFromPack(null, null, TEMPLATE), null)
  // Empty pack, ZIP-only saved place (never geocoded on the phone).
  assert.equal(offlineMapRegionFromPack({ resources: [] }, { zip: "13901" }, TEMPLATE), null)
  // Pack rows without coordinates cannot anchor a region.
  const pack = buildOfflineResourcePack([makeKnown(1, "2026-10-27T10:00:00.000Z")], [], "2026-10-27T11:00:00.000Z")
  assert.equal(offlineMapRegionFromPack(pack, { zip: "13901" }, TEMPLATE), null)
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
  const region = offlineMapRegionFromPack(pack, saved, TEMPLATE)
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
  const farRegion = offlineMapRegionFromPack(far, saved, TEMPLATE)
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

test("Feature 60 tile URLs use z/x/y order and longitude wraps below -180", () => {
  assert.equal(tileUrl(TEMPLATE, 15, 9916, 12120), "https://tiles.example.test/v1/15/9916/12120.png")
  assert.equal(tileUrl("https://t.example.test/{z}/{y}/{x}.png", 15, 1, 2), "https://t.example.test/15/2/1.png")
  assert.deepEqual(tileXYFor(0, -190, 15), tileXYFor(0, 170, 15))
  assert.deepEqual(tileXYFor(0, 540, 15), tileXYFor(0, -180, 15))
})

test("Feature 60 cap keeps the saved place's own tile block ahead of far resource anchors", () => {
  const far = buildOfflineResourcePack(
    [
      makeKnown(1, "2026-10-27T10:00:00.000Z", { lat: 40.71, lon: -74.0 }),
      makeKnown(2, "2026-10-27T10:05:00.000Z", { lat: 47.6, lon: -122.33 }),
    ],
    [],
    "2026-10-27T11:00:00.000Z",
  )
  // The saved place is the easternmost anchor, which a plain x-sort would cut first.
  const saved = { lat: 42.36, lon: -71.06 }
  const region = offlineMapRegionFromPack(far, saved, TEMPLATE)
  assert.ok(region)
  assert.equal(region.tiles.length, OFFLINE_MAP_MAX_TILES)
  const own = offlineMapTilesFor(saved, TEMPLATE)
  for (const tile of own) assert.ok(region.tiles.some((row) => row.x === tile.x && row.y === tile.y), `saved-place tile ${tile.x}/${tile.y} kept`)
  // Every anchor keeps at least its own center tile.
  for (const anchor of [{ lat: 40.71, lon: -74.0 }, { lat: 47.6, lon: -122.33 }]) {
    const center = tileXYFor(anchor.lat, anchor.lon)
    assert.ok(region.tiles.some((row) => row.x === center.x && row.y === center.y))
  }
})

test("Feature 60 refuses the OpenStreetMap tile server, insecure URLs, credentials and missing attribution", () => {
  assert.equal(parseTileProvider(undefined, undefined), null)
  assert.equal(parseTileProvider(TEMPLATE, ""), null)
  assert.equal(parseTileProvider(TEMPLATE, undefined), null)
  assert.equal(parseTileProvider("https://tile.openstreetmap.org/{z}/{x}/{y}.png", ATTRIBUTION), null)
  assert.equal(parseTileProvider("https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", ATTRIBUTION), null)
  assert.equal(parseTileProvider("http://tiles.example.test/{z}/{x}/{y}.png", ATTRIBUTION), null)
  assert.equal(parseTileProvider("https://user:pw@tiles.example.test/{z}/{x}/{y}.png", ATTRIBUTION), null)
  assert.equal(parseTileProvider("https://tiles.example.test/{z}/{x}.png", ATTRIBUTION), null)
  assert.equal(parseTileProvider("not a url {z}{x}{y}", ATTRIBUTION), null)
  assert.deepEqual(PROVIDER, { template: TEMPLATE, host: "tiles.example.test", attribution: ATTRIBUTION })
})

test("Feature 60 offline maps are off by default, per provider, and revocable", () => {
  const map = new Map<string, string>()
  const store = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => { map.set(key, value) },
    removeItem: (key: string) => { map.delete(key) },
  }
  assert.equal(readOfflineMapOptIn(store, PROVIDER), null)
  assert.equal(readOfflineMapOptIn(store, null), null)
  saveOfflineMapOptIn(store, PROVIDER, new Date("2026-10-28T12:00:00.000Z"))
  assert.equal(readOfflineMapOptIn(store, PROVIDER)?.at, "2026-10-28T12:00:00.000Z")
  // Consent given for one provider does not carry over to a different one.
  const other = parseTileProvider("https://other.example.test/{z}/{x}/{y}.png", ATTRIBUTION)
  assert.equal(readOfflineMapOptIn(store, other), null)
  // No provider configured means no consent can apply.
  assert.equal(readOfflineMapOptIn(store, null), null)
  map.set(OFFLINE_MAP_OPTIN_KEY, "{broken")
  assert.equal(readOfflineMapOptIn(store, PROVIDER), null)
  saveOfflineMapOptIn(store, PROVIDER)
  clearOfflineMapOptIn(store)
  assert.equal(readOfflineMapOptIn(store, PROVIDER), null)
  const text = OFFLINE_MAP_CONSENT_TEXT("tiles.example.test")
  assert.match(text, /Off unless you turn it on/)
  assert.match(text, /tiles\.example\.test can see which map squares are requested/)
  assert.match(text, /Nothing is requested before you turn this on/)
  assert.match(text, /deletes the saved map pictures/)
})

test("Feature 60 warming stores tiles without cookies or referrer, is capped, and clearing deletes them", async () => {
  const originalFetch = globalThis.fetch
  const originalCaches = (globalThis as { caches?: unknown }).caches
  const stored = new Map<string, string>()
  const deleted: string[] = []
  const init: RequestInit[] = []
  const fakeCache = {
    match: async (url: string) => (stored.has(url) ? ({} as Response) : undefined),
    put: async (url: string) => { stored.set(url, "x") },
    keys: async () => [...stored.keys()].map((url) => ({ url })),
    delete: async (request: { url: string }) => { stored.delete(request.url); return true },
  }
  let cacheDeleted = ""
  ;(globalThis as { caches?: unknown }).caches = {
    open: async (name: string) => { assert.equal(name, OFFLINE_MAP_CACHE_NAME); return fakeCache },
    delete: async (name: string) => { cacheDeleted = name; return true },
  }
  globalThis.fetch = (async (_url: string, options?: RequestInit) => { init.push(options ?? {}); return { ok: true } as Response }) as unknown as typeof fetch
  try {
    await warmOfflineMapCache(null)
    assert.equal(init.length, 0)
    const region = offlineMapRegionFromPack({ resources: [{ lat: 42.36, lon: -71.06 }] }, null, TEMPLATE)
    assert.ok(region)
    await warmOfflineMapCache(region)
    assert.equal(init.length, region.tiles.length)
    assert.ok(init.every((row) => row.credentials === "omit" && row.referrerPolicy === "no-referrer" && row.mode === "cors"))
    assert.ok(stored.size <= OFFLINE_MAP_CACHE_MAX)
    // Already-saved tiles are not requested again.
    await warmOfflineMapCache(region)
    assert.equal(init.length, region.tiles.length)
    await clearOfflineMapCache()
    assert.equal(cacheDeleted, OFFLINE_MAP_CACHE_NAME)
    assert.deepEqual(deleted, [])
    // A failing or missing cache never throws.
    ;(globalThis as { caches?: unknown }).caches = undefined
    await warmOfflineMapCache(region)
    await clearOfflineMapCache()
  } finally {
    globalThis.fetch = originalFetch
    ;(globalThis as { caches?: unknown }).caches = originalCaches
  }
})

test("Feature 60 service worker never intercepts or fetches third-party tiles and keeps the tile cache", () => {
  const worker = readFileSync("public/sw.js", "utf8")
  assert.match(worker, /narcoguard-shell-v14/)
  assert.match(worker, /narcoguard-map-tiles-v1/)
  assert.match(worker, /key !== CACHE_NAME && key !== TILE_CACHE_NAME/)
  assert.doesNotMatch(worker, /openstreetmap/)
  assert.doesNotMatch(worker, /serveTile/)
  assert.match(worker, /requestUrl\.origin !== self\.location\.origin\) return/)
  assert.match(worker, /requestUrl\.pathname\.startsWith\("\/api\/"\)/)
})

test("Feature 60 offline page is opt-in, never requests a provider, and shows attribution and stale states", () => {
  const offline = readFileSync("public/offline.html", "utf8")
  assert.match(offline, /id="offline-map-section"[^>]*hidden/)
  assert.match(offline, /narcoguard_offline_map_optin_v1/)
  assert.match(offline, /caches\.open\(CACHE_NAME\)/)
  assert.match(offline, /Map data: /)
  assert.match(offline, /Saved map region/)
  assert.match(offline, /may be out of date/)
  assert.match(offline, /not a claim about what is there now/)
  assert.match(offline, /No map region is saved on this device yet/)
  assert.match(offline, /No map tiles are saved for this area yet/)
  assert.match(offline, /not saved/)
  assert.match(offline, /narcoguard_saved_place_v1/)
  // No network from this page's map code: no fetch, no remote image URL, no OSM host.
  const mapScript = offline.slice(offline.indexOf("Feature 60"))
  assert.doesNotMatch(mapScript, /fetch\(/)
  assert.doesNotMatch(mapScript, /openstreetmap/)
  assert.doesNotMatch(mapScript, /img\.src = (?!URL\.createObjectURL)/)
  // Existing saved-resources wording and emergency content are untouched.
  assert.match(offline, /Saved resources from recent lookups/)
  assert.match(offline, /href="tel:911"/)
  assert.doesNotMatch(offline, />Open now</)
})

test("Feature 60 only warms tiles after opt-in and forgetting the saved place deletes them", () => {
  const component = readFileSync("components/guardian/maslow-resource-automation.tsx", "utf8")
  assert.match(component, /configuredTileProvider\(\)/)
  assert.match(component, /if \(!provider \|\| !readOfflineMapOptIn\(window\.localStorage, provider\)\) return/)
  assert.match(component, /data-testid="offline-map-consent"/)
  assert.match(component, /useState\(false\)/)
  const place = readFileSync("lib/saved-place.ts", "utf8")
  assert.match(place, /void clearOfflineMapCache\(\)/)
  const config = readFileSync("lib/offline-map-config.ts", "utf8")
  assert.doesNotMatch(config, /https:\/\/tile\.openstreetmap/)
})
