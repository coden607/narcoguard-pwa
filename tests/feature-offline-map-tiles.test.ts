import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { OFFLINE_MAP_MAX_TILES, offlineMapRegionFromPack, tileXYFor } from "../lib/offline-map-region"
import { OFFLINE_MAP_CACHE_MAX, OFFLINE_MAP_CACHE_NAME, clearOfflineMapCache, warmOfflineMapCache } from "../lib/offline-map-cache"
import { OFFLINE_MAP_CONSENT_TEXT, clearOfflineMapOptIn, parseTileProvider, readOfflineMapOptIn, saveOfflineMapOptIn, tileUrl } from "../lib/offline-map-config"
import { buildOfflineResourcePack, readOfflineResourcePack, saveOfflineResourcePack, OFFLINE_RESOURCE_PACK_KEY } from "../lib/offline-resource-pack"
import type { KnownResource } from "../lib/resource-inventory"

const TEMPLATE = "https://tiles.example.test/v1/{z}/{x}/{y}.png"
const ATTRIBUTION = "© Example Maps, © OpenStreetMap contributors"
const PROVIDER = parseTileProvider(TEMPLATE, ATTRIBUTION)!
const AT = "2026-10-27T10:00:00.000Z"

const makeKnown = (index: number, coords?: { lat: number; lon: number }): KnownResource => ({
  key: `food|resource-${index}|100 main st`,
  zip: "13901",
  resource: { name: `Resource ${index}`, kind: "food", source: "OpenStreetMap contributors", address: "100 Main St", ...(coords ?? {}) },
  firstSeenAt: AT,
  lastSeenAt: AT,
  lastLookupAt: AT,
  lastReturned: true,
})
const packOf = (...coords: ({ lat: number; lon: number } | undefined)[]) =>
  buildOfflineResourcePack(coords.map((c, i) => makeKnown(i + 1, c)), [], "2026-10-27T11:00:00.000Z")

test("tiles use the slippy-map z/x/y scheme and longitude wraps in both directions", () => {
  assert.deepEqual(tileXYFor(42.3583, -71.0592, 15), { x: 9916, y: 12120 })
  assert.deepEqual(tileXYFor(-85.2, 180.1, 15), { x: 9, y: 32767 })
  assert.deepEqual(tileXYFor(0, -190, 15), tileXYFor(0, 170, 15))
  assert.deepEqual(tileXYFor(Number.NaN, Number.NaN, 15), { x: 16384, y: 16384 })
  assert.equal(tileUrl(TEMPLATE, 15, 9916, 12120), "https://tiles.example.test/v1/15/9916/12120.png")
  assert.equal(tileUrl("https://t.example.test/{z}/{y}/{x}.png", 15, 1, 2), "https://t.example.test/15/2/1.png")
})

test("region is empty without coordinates, bounded, and keeps the saved place's block when capped", () => {
  assert.equal(offlineMapRegionFromPack(null, null, TEMPLATE), null)
  assert.equal(offlineMapRegionFromPack(packOf(undefined), { zip: "13901" }, TEMPLATE), null)
  const saved = { lat: 42.36, lon: -71.06 }
  const near = offlineMapRegionFromPack(packOf({ lat: 42.35, lon: -71.05 }, { lat: 42.36, lon: -71.06 }), saved, TEMPLATE)
  assert.ok(near)
  assert.equal(near.anchors, 2)
  // The saved place is the easternmost anchor, which a plain x-sort would cut first.
  const far = [{ lat: 40.71, lon: -74.0 }, { lat: 47.6, lon: -122.33 }, { lat: 34.05, lon: -118.24 }]
  const region = offlineMapRegionFromPack(packOf(...far), saved, TEMPLATE)
  assert.ok(region)
  assert.equal(region.anchors, 3)
  assert.equal(region.tiles.length, OFFLINE_MAP_MAX_TILES)
  const center = tileXYFor(saved.lat, saved.lon)
  for (let dx = -1; dx <= 1; dx += 1) {
    for (let dy = -1; dy <= 1; dy += 1) assert.ok(region.tiles.some((t) => t.x === center.x + dx && t.y === center.y + dy))
  }
  for (const anchor of far.slice(0, 2)) {
    const c = tileXYFor(anchor.lat, anchor.lon)
    assert.ok(region.tiles.some((t) => t.x === c.x && t.y === c.y))
  }
  assert.ok(region.tiles.every((t) => t.url === `https://tiles.example.test/v1/15/${t.x}/${t.y}.png`))
})

test("the offline pack carries and sanitizes public resource coordinates", () => {
  const map = new Map<string, string>()
  const storage = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v) } }
  saveOfflineResourcePack(storage, [makeKnown(1, { lat: 42.35, lon: -71.05 }), makeKnown(2)], [], "2026-10-27T11:00:00.000Z")
  const rows = readOfflineResourcePack(storage)?.resources ?? []
  assert.equal(rows.find((r) => r.name === "Resource 1")?.lat, 42.35)
  assert.equal(rows.find((r) => r.name === "Resource 2")?.lat, undefined)
  map.set(OFFLINE_RESOURCE_PACK_KEY, JSON.stringify({ version: 1, generatedAt: AT, resources: [{ key: "k", zip: "13901", name: "Bad", kind: "food", source: "OSM", lastSeenAt: AT, lat: "42.35", lon: Number.POSITIVE_INFINITY }] }))
  assert.equal(readOfflineResourcePack(storage)?.resources[0].lat, undefined)
})

test("provider config refuses OSM hosts, insecure URLs, credentials and missing attribution", () => {
  for (const [tpl, attr] of [
    [undefined, undefined], [TEMPLATE, ""], ["https://tile.openstreetmap.org/{z}/{x}/{y}.png", ATTRIBUTION],
    ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png", ATTRIBUTION], ["http://tiles.example.test/{z}/{x}/{y}.png", ATTRIBUTION],
    ["https://user:pw@tiles.example.test/{z}/{x}/{y}.png", ATTRIBUTION], ["https://tiles.example.test/{z}/{x}.png", ATTRIBUTION],
  ] as const) assert.equal(parseTileProvider(tpl, attr), null)
  assert.deepEqual(PROVIDER, { template: TEMPLATE, host: "tiles.example.test", attribution: ATTRIBUTION })
})

test("offline maps are off by default, per provider, and revocable", () => {
  const map = new Map<string, string>()
  const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v) }, removeItem: (k: string) => { map.delete(k) } }
  assert.equal(readOfflineMapOptIn(store, PROVIDER), null)
  saveOfflineMapOptIn(store, PROVIDER, new Date("2026-10-28T12:00:00.000Z"))
  assert.equal(readOfflineMapOptIn(store, PROVIDER)?.at, "2026-10-28T12:00:00.000Z")
  assert.equal(readOfflineMapOptIn(store, parseTileProvider("https://other.example.test/{z}/{x}/{y}.png", ATTRIBUTION)), null)
  assert.equal(readOfflineMapOptIn(store, null), null)
  clearOfflineMapOptIn(store)
  assert.equal(readOfflineMapOptIn(store, PROVIDER), null)
  const text = OFFLINE_MAP_CONSENT_TEXT("tiles.example.test")
  for (const part of [/Off unless you turn it on/, /tiles\.example\.test can see which map squares/, /Nothing is requested before you turn this on/, /deletes the saved map pictures/]) assert.match(text, part)
})

test("warming sends no cookies or referrer, is capped and idempotent, and clearing deletes tiles", async () => {
  const originalFetch = globalThis.fetch
  const originalCaches = (globalThis as { caches?: unknown }).caches
  const stored = new Map<string, string>()
  const init: RequestInit[] = []
  let cleared = ""
  const cache = {
    match: async (url: string) => (stored.has(url) ? ({} as Response) : undefined),
    put: async (url: string) => { stored.set(url, "x") },
    keys: async () => [...stored.keys()].map((url) => ({ url })),
    delete: async (request: { url: string }) => stored.delete(request.url),
  }
  ;(globalThis as { caches?: unknown }).caches = { open: async (name: string) => { assert.equal(name, OFFLINE_MAP_CACHE_NAME); return cache }, delete: async (name: string) => { cleared = name; return true } }
  globalThis.fetch = (async (_url: string, options?: RequestInit) => { init.push(options ?? {}); return { ok: true } as Response }) as unknown as typeof fetch
  try {
    await warmOfflineMapCache(null)
    assert.equal(init.length, 0)
    const region = offlineMapRegionFromPack({ resources: [{ lat: 42.36, lon: -71.06 }] }, null, TEMPLATE)
    assert.ok(region)
    await warmOfflineMapCache(region)
    await warmOfflineMapCache(region)
    assert.equal(init.length, region.tiles.length)
    assert.ok(init.every((o) => o.credentials === "omit" && o.referrerPolicy === "no-referrer" && o.mode === "cors"))
    assert.ok(stored.size <= OFFLINE_MAP_CACHE_MAX)
    await clearOfflineMapCache()
    assert.equal(cleared, OFFLINE_MAP_CACHE_NAME)
    ;(globalThis as { caches?: unknown }).caches = undefined
    await warmOfflineMapCache(region)
    await clearOfflineMapCache()
  } finally {
    globalThis.fetch = originalFetch
    ;(globalThis as { caches?: unknown }).caches = originalCaches
  }
})

test("service worker, offline page and UI never contact a provider before opt-in", () => {
  const worker = readFileSync("public/sw.js", "utf8")
  assert.match(worker, /key !== CACHE_NAME && key !== TILE_CACHE_NAME/)
  assert.match(worker, /narcoguard-shell-v14/)
  assert.doesNotMatch(worker, /openstreetmap|serveTile/)
  const offline = readFileSync("public/offline.html", "utf8")
  assert.match(offline, /id="offline-map-section"[^>]*hidden/)
  assert.match(offline, /narcoguard_offline_map_optin_v1/)
  assert.match(offline, /Map data: /)
  assert.match(offline, /may be out of date/)
  assert.match(offline, /No map tiles are saved for this area yet/)
  const mapScript = offline.slice(offline.indexOf("Feature 60"))
  assert.doesNotMatch(mapScript, /fetch\(|openstreetmap/)
  assert.match(offline, /href="tel:911"/)
  assert.doesNotMatch(offline, />Open now</)
  const component = readFileSync("components/guardian/maslow-resource-automation.tsx", "utf8")
  assert.match(component, /if \(!provider \|\| !readOfflineMapOptIn\(window\.localStorage, provider\)\) return/)
  assert.match(component, /data-testid="offline-map-consent"/)
  assert.match(readFileSync("lib/saved-place.ts", "utf8"), /void clearOfflineMapCache\(\)/)
})
