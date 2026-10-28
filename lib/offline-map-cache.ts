// Browser Cache API storage for opted-in offline map tiles. The page (not the service worker)
// fetches and stores tiles, so the service worker never touches a third-party origin.
// Every entry point is a no-op unless the caller already checked consent.

import type { OfflineMapRegion } from "./offline-map-region"

export const OFFLINE_MAP_CACHE_NAME = "narcoguard-map-tiles-v1"
/** Hard cap on stored tiles; the oldest are dropped first. */
export const OFFLINE_MAP_CACHE_MAX = 48

const hasCache = () => typeof caches !== "undefined" && typeof caches.open === "function"

/**
 * Fetch and store the region's tiles. Call only after the person opted in. Requests carry no
 * cookies and no referrer. Failures are swallowed: warming must never break the page.
 */
export async function warmOfflineMapCache(region: OfflineMapRegion | null): Promise<void> {
  if (!region || !hasCache() || typeof fetch !== "function") return
  try {
    const cache = await caches.open(OFFLINE_MAP_CACHE_NAME)
    for (const tile of region.tiles) {
      if (await cache.match(tile.url)) continue
      try {
        const response = await fetch(tile.url, { mode: "cors", credentials: "omit", referrerPolicy: "no-referrer" })
        if (response.ok) await cache.put(tile.url, response)
      } catch {
        // Offline or provider refused; the tile just stays "not saved".
      }
    }
    const keys = await cache.keys()
    for (let index = 0; index < keys.length - OFFLINE_MAP_CACHE_MAX; index += 1) await cache.delete(keys[index])
  } catch {
    // Cache storage unavailable.
  }
}

/** Delete every saved map tile from this device. */
export async function clearOfflineMapCache(): Promise<void> {
  if (!hasCache() || typeof caches.delete !== "function") return
  try { await caches.delete(OFFLINE_MAP_CACHE_NAME) } catch { /* nothing to delete */ }
}
