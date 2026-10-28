// Offline map tiles for the saved region around the on-device saved place and known resources.
// The region is bounded and every surface labels the cache as stale. Anchors are the saved
// place (coordinates already rounded to about 1 km on the phone) and resource coordinates from
// public directories. Pure functions only: nothing here touches the network or storage.

import { OFFLINE_MAP_ZOOM, tileUrl } from "./offline-map-config"
import type { OfflineResource } from "./offline-resource-pack"
import type { SavedPlace } from "./saved-place"

export { OFFLINE_MAP_ZOOM }
/** A 3x3 block around each anchor keeps the region near the ~1 km location rounding. */
export const OFFLINE_MAP_GRID_RADIUS = 1
/** Total tile count shown and cached per region. */
export const OFFLINE_MAP_MAX_TILES = 12
/** Known resources with coordinates that can anchor their own map block. */
export const OFFLINE_MAP_MAX_RESOURCE_ANCHORS = 2

export type OfflineMapTile = { z: number; x: number; y: number; url: string }
export type OfflineMapRegion = { zoom: number; tiles: OfflineMapTile[]; anchors: number }

const MIN_LAT = -85.05112878
const MAX_LAT = 85.05112878

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Slippy-map tile for a coordinate, clamped to the renderable world. */
export function tileXYFor(lat: number, lon: number, zoom = OFFLINE_MAP_ZOOM): { x: number; y: number } {
  const safeLat = clamp(Number.isFinite(lat) ? lat : 0, MIN_LAT, MAX_LAT)
  // Wrap longitude into [-180, 180) for any input, including values below -180.
  const wrappedLon = ((((Number.isFinite(lon) ? lon : 0) + 180) % 360) + 360) % 360 - 180
  const n = 2 ** zoom
  const x = Math.floor(((wrappedLon + 180) / 360) * n)
  const latRad = (safeLat * Math.PI) / 180
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n)
  return { x: clamp(x, 0, n - 1), y: clamp(y, 0, n - 1) }
}

type Candidate = { z: number; x: number; y: number; ring: number }

/** The bounded square around one anchor, nearest the center first. */
function candidatesFor(center: { lat: number; lon: number }, zoom: number, radius: number): Candidate[] {
  const n = 2 ** zoom
  const { x, y } = tileXYFor(center.lat, center.lon, zoom)
  const out: Candidate[] = []
  for (let dx = -radius; dx <= radius; dx += 1) {
    for (let dy = -radius; dy <= radius; dy += 1) {
      out.push({ z: zoom, x: clamp(x + dx, 0, n - 1), y: clamp(y + dy, 0, n - 1), ring: Math.max(Math.abs(dx), Math.abs(dy)) })
    }
  }
  // Stable sort keeps the x-then-y scan order within a ring.
  return out.sort((a, b) => a.ring - b.ring)
}

/** The bounded square of tile URLs around one anchor, deduped and sorted by x then y. */
export function offlineMapTilesFor(
  center: { lat: number; lon: number },
  template: string,
  zoom = OFFLINE_MAP_ZOOM,
  radius = OFFLINE_MAP_GRID_RADIUS,
): OfflineMapTile[] {
  const byKey = new Map<string, OfflineMapTile>()
  for (const c of candidatesFor(center, zoom, radius)) {
    const key = `${c.z}/${c.x}/${c.y}`
    if (!byKey.has(key)) byKey.set(key, { z: c.z, x: c.x, y: c.y, url: tileUrl(template, c.z, c.x, c.y) })
  }
  return [...byKey.values()].sort((a, b) => a.x - b.x || a.y - b.y)
}

type PackLike = { resources: readonly Pick<OfflineResource, "lat" | "lon">[] } | null | undefined

/**
 * The offline map region: the saved place (only when it has on-device coordinates; a ZIP is
 * never geocoded here) plus up to two known resources that carry public-directory coordinates.
 * When the cap forces a cut, every anchor's own tile survives first (saved place leading),
 * then outer rings in anchor priority order, so the saved place is never the part dropped.
 * Returns null when nothing has coordinates, so the UI can say so explicitly.
 */
export function offlineMapRegionFromPack(
  pack: PackLike,
  savedPlace: SavedPlace | null | undefined,
  template: string,
): OfflineMapRegion | null {
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

  const ordered: Candidate[] = []
  centers.forEach((center) => ordered.push(...candidatesFor(center, OFFLINE_MAP_ZOOM, OFFLINE_MAP_GRID_RADIUS)))
  // Ring first, then anchor priority (the stable sort preserves anchor order within a ring).
  ordered.sort((a, b) => a.ring - b.ring)
  const byKey = new Map<string, OfflineMapTile>()
  for (const c of ordered) {
    if (byKey.size >= OFFLINE_MAP_MAX_TILES) break
    const key = `${c.z}/${c.x}/${c.y}`
    if (!byKey.has(key)) byKey.set(key, { z: c.z, x: c.x, y: c.y, url: tileUrl(template, c.z, c.x, c.y) })
  }
  const tiles = [...byKey.values()].sort((a, b) => a.x - b.x || a.y - b.y)
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
