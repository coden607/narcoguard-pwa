// Offline map tiles for the saved region around the on-device saved place and known resources.
// The region is bounded, tiles are cached by the service worker with a hard cap, and every
// surface labels the cache as stale. Anchors are the saved place (coordinates already rounded
// to about 1 km on the phone) and resource coordinates from public directories, so no precise
// personal location is needed or exposed. Nothing here is logged or sent anywhere by itself.

import type { OfflineResource } from "./offline-resource-pack"
import type { SavedPlace } from "./saved-place"

export const OFFLINE_MAP_TILE_HOST = "https://tile.openstreetmap.org"
export const OFFLINE_MAP_ZOOM = 15
/** A 3x3 block around each anchor keeps the region near the ~1 km location rounding. */
export const OFFLINE_MAP_GRID_RADIUS = 1
/** Total tile count shown and warmed per region; the service-worker cache cap is separate. */
export const OFFLINE_MAP_MAX_TILES = 12
/** Known resources with coordinates that can anchor their own map block. */
export const OFFLINE_MAP_MAX_RESOURCE_ANCHORS = 2

export type OfflineMapTile = {
  x: number
  y: number
  url: string
}

export type OfflineMapRegion = {
  zoom: number
  tiles: OfflineMapTile[]
  anchors: number
}

const MIN_LAT = -85.05112878
const MAX_LAT = 85.05112878

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Slippy-map tile for a coordinate, clamped to the renderable world. */
export function tileXYFor(lat: number, lon: number, zoom = OFFLINE_MAP_ZOOM): { x: number; y: number } {
  const safeLat = clamp(Number.isFinite(lat) ? lat : 0, MIN_LAT, MAX_LAT)
  const wrappedLon = ((Number.isFinite(lon) ? lon : 0) + 180) % 360 - 180
  const n = 2 ** zoom
  const x = Math.floor(((wrappedLon + 180) / 360) * n)
  const latRad = (safeLat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) }
}

/** The bounded square of tile URLs around one anchor, deduped and sorted. */
export function offlineMapTilesFor(
  center: { lat: number; lon: number },
  zoom = OFFLINE_MAP_ZOOM,
  radius = OFFLINE_MAP_GRID_RADIUS,
): OfflineMapTile[] {
  const n = 2 ** zoom
  const { x, y } = tileXYFor(center.lat, center.lon, zoom)
  const byKey = new Map<string, OfflineMapTile>()
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      const tx = clamp(x + dx, 0, n - 1)
      const ty = clamp(y + dy, 0, n - 1)
      const key = `${zoom}/${tx}/${ty}`
      if (!byKey.has(key)) byKey.set(key, { x: tx, y: ty, url: `${OFFLINE_MAP_TILE_HOST}/${key}.png` })
    }
  }
  return [...byKey.values()].sort((a, b) => a.x - b.x || a.y - b.y)
}

type PackLike = { resources: readonly Pick<OfflineResource, "lat" | "lon">[] } | null | undefined

/**
 * The offline map region: the saved place (only when it has on-device coordinates; a ZIP is
 * never geocoded here) plus up to two known resources that carry public-directory coordinates.
 * Returns null when nothing has coordinates, so the UI can say so explicitly.
 */
export function offlineMapRegionFromPack(pack: PackLike, savedPlace: SavedPlace | null | undefined): OfflineMapRegion | null {
  const centers: { lat: number; lon: number }[] = []
  if (savedPlace && "lat" in savedPlace && Number.isFinite(savedPlace.lat) && Number.isFinite(savedPlace.lon)) {
    centers.push({ lat: savedPlace.lat, lon: savedPlace.lon })
  }
  for (const row of pack?.resources ?? []) {
    if (centers.length >= OFFLINE_MAP_MAX_RESOURCE_ANCHORS + 1) break
    if (typeof row.lat !== "number" || typeof row.lon !== "number") continue
    if (!Number.isFinite(row.lat) || !Number.isFinite(row.lon)) continue
    if (centers.some((center) => center.lat === row.lat && center.lon === row.lon)) continue
    centers.push({ lat: row.lat, lon: row.lon })
  }
  if (centers.length === 0) return null

  const byKey = new Map<string, OfflineMapTile>()
  for (const center of centers) {
    for (const tile of offlineMapTilesFor(center)) byKey.set(`${tile.x}/${tile.y}`, tile)
  }
  const tiles = [...byKey.values()].sort((a, b) => a.x - b.x || a.y - b.y).slice(0, OFFLINE_MAP_MAX_TILES)
  return { zoom: OFFLINE_MAP_ZOOM, tiles, anchors: centers.length }
}

/** Explicit staleness wording for a cached tile or region; never claims current availability. */
export function offlineMapCacheLabel(cachedAtIso: string, now = Date.now()): string {
  const age = now - Date.parse(cachedAtIso)
  if (!Number.isFinite(age) || age < 0) return "cache age unknown"
  const minutes = Math.floor(age / 60_000)
  if (minutes < 60) return `cached ${Math.max(1, minutes)} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return `cached ${hours} hr ago`
  return `cached ${Math.floor(hours / 24)} days ago`
}

/**
 * Ask the service worker to cache the region's tiles (cache-first, hard cap in sw.js).
 * Fire-and-forget: warming must never block or break the page, and when the worker is not
 * controlling this page yet the call is a no-op.
 */
export function warmOfflineMapCache(region: OfflineMapRegion | null): void {
  if (!region || typeof fetch !== "function") return
  for (const tile of region.tiles) fetch(tile.url).catch(() => undefined)
}
