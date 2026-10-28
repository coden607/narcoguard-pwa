// Offline map tiles are opt-in and provider-agnostic. Nothing is requested from any map
// provider until (a) the deployment configures a tile provider and (b) the person turns
// offline maps on for this device. No key or account is stored in the repo.
//
// Deployment config (both required, both public build-time values, never secrets):
//   NEXT_PUBLIC_OFFLINE_MAP_TILE_URL    https tile template with {z}, {x} and {y}
//   NEXT_PUBLIC_OFFLINE_MAP_ATTRIBUTION attribution text the provider's terms require
// The provider's terms must allow offline or prefetched tiles. The public OpenStreetMap
// tile server forbids bulk prefetching, so its hosts are refused here.

export const OFFLINE_MAP_OPTIN_KEY = "narcoguard_offline_map_optin_v1"
export const OFFLINE_MAP_ZOOM = 15

export type TileProvider = { template: string; host: string; attribution: string }
export type OfflineMapOptIn = { template: string; attribution: string; at: string }

const FORBIDDEN_HOST = /(^|\.)openstreetmap\.org$/i

/** A usable provider, or null so the feature stays fully disabled. */
export function parseTileProvider(template: string | undefined, attribution: string | undefined): TileProvider | null {
  const tpl = (template ?? "").trim()
  const attr = (attribution ?? "").trim().slice(0, 200)
  if (!tpl || !attr) return null
  if (!tpl.includes("{z}") || !tpl.includes("{x}") || !tpl.includes("{y}")) return null
  let url: URL
  try { url = new URL(tpl.replace("{z}", "0").replace("{x}", "0").replace("{y}", "0")) } catch { return null }
  if (url.protocol !== "https:" || url.username || url.password) return null
  if (FORBIDDEN_HOST.test(url.hostname)) return null
  return { template: tpl, host: url.hostname, attribution: attr }
}

/** Reads the build-time config. Literal env access so Next can inline the values. */
export function configuredTileProvider(): TileProvider | null {
  return parseTileProvider(process.env.NEXT_PUBLIC_OFFLINE_MAP_TILE_URL, process.env.NEXT_PUBLIC_OFFLINE_MAP_ATTRIBUTION)
}

export function tileUrl(template: string, z: number, x: number, y: number): string {
  return template.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y))
}

/** The stored consent, only while it still matches the configured provider; otherwise null (off). */
export function readOfflineMapOptIn(store: Pick<Storage, "getItem"> | undefined, provider: TileProvider | null): OfflineMapOptIn | null {
  if (!provider) return null
  try {
    const value = JSON.parse(store?.getItem(OFFLINE_MAP_OPTIN_KEY) ?? "null") as Record<string, unknown> | null
    if (value && value.template === provider.template && typeof value.attribution === "string" && typeof value.at === "string") {
      return { template: provider.template, attribution: provider.attribution, at: value.at }
    }
  } catch {
    // Unreadable or blocked storage means no consent.
  }
  return null
}

export function saveOfflineMapOptIn(store: Pick<Storage, "setItem"> | undefined, provider: TileProvider, now = new Date()): void {
  try { store?.setItem(OFFLINE_MAP_OPTIN_KEY, JSON.stringify({ template: provider.template, attribution: provider.attribution, at: now.toISOString() })) } catch { /* storage blocked */ }
}

export function clearOfflineMapOptIn(store: Pick<Storage, "removeItem"> | undefined): void {
  try { store?.removeItem(OFFLINE_MAP_OPTIN_KEY) } catch { /* nothing to clear */ }
}

export const OFFLINE_MAP_CONSENT_TEXT = (host: string) =>
  `Off unless you turn it on. When on, this device downloads map pictures of the area around your saved place and your saved resources from ${host}, so you can see them without a connection. ${host} can see which map squares are requested, which shows your approximate area, plus your network address. Nothing is requested before you turn this on. Turning it off, or forgetting your saved place, deletes the saved map pictures from this device.`
