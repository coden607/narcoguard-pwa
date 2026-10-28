// Low-bandwidth mode for Find help. The person can turn it on (or the device asks for
// data saving via navigator.connection.saveData); directory searches then answer from an
// on-device cache first and skip the extra fresh-web-leads fetch. Everything stays on the
// phone: the cache key is the rounded search URL, and the cached body is public directory
// data. Emergency paths never depend on this mode.

export const LOW_BANDWIDTH_KEY = "narcoguard_low_bandwidth_v1"
/** Same-tab signal so every open view follows the toggle. Contains no personal data. */
export const LOW_BANDWIDTH_CHANGED_EVENT = "narcoguard-low-bandwidth-changed"
export const LOW_BANDWIDTH_CACHE = "narcoguard-low-bandwidth-v1"

export type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

/** The device's own data-saving hint (Chrome/Android). Absent elsewhere, so optional. */
export interface ConnectionLike {
  saveData?: boolean
}

/** Off unless the person turned it on. Blocked storage simply means off. */
export function readLowBandwidthChoice(store: Store | undefined): boolean {
  return readLowBandwidthSetting(store) === "on"
}

/** The person's explicit choice, or undefined when they never made one (or storage is blocked). */
export function readLowBandwidthSetting(store: Store | undefined): "on" | "off" | undefined {
  try {
    const value = store?.getItem(LOW_BANDWIDTH_KEY)
    return value === "on" || value === "off" ? value : undefined
  } catch {
    return undefined
  }
}

export function saveLowBandwidthChoice(store: Store | undefined, on: boolean): void {
  try {
    store?.setItem(LOW_BANDWIDTH_KEY, on ? "on" : "off")
  } catch { /* storage blocked; the toggle still works for this view */ }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOW_BANDWIDTH_CHANGED_EVENT))
}

export function systemSavesData(connection: ConnectionLike | null | undefined): boolean {
  return connection?.saveData === true
}

/** An explicit choice (on or off) always wins; with no choice the device data-saving hint decides. */
export function isLowBandwidthActive(store: Store | undefined, connection: ConnectionLike | null | undefined): boolean {
  const choice = readLowBandwidthSetting(store)
  return choice === undefined ? systemSavesData(connection) : choice === "on"
}

/** Removes every cached search, which includes keys carrying a ZIP or rounded coordinates. */
export async function clearDirectoryCache(storage: { delete(name: string): Promise<boolean> } | undefined): Promise<void> {
  try { await storage?.delete(LOW_BANDWIDTH_CACHE) } catch { /* nothing cached, or CacheStorage blocked */ }
}

export interface DirectoryCaches {
  match(key: string): Promise<Response | undefined>
  put(key: string, response: Response): Promise<void>
}

export type FetchLike = (url: string) => Promise<Response>

export interface DirectoryFetchResult {
  ok: boolean
  /** true when the body came from the on-device cache, not the network. */
  servedFromCache: boolean
  body: unknown
  /** When servedFromCache, the time the cached search originally ran (if the body carried one). */
  fetchedAt?: string
}

export interface DirectoryFetchOptions {
  lowData: boolean
  caches?: DirectoryCaches
  fetchImpl?: FetchLike
  /** Called when a background refresh finishes after a cached answer was shown. */
  onRefresh?: (result: { body: unknown; fetchedAt?: string }) => void
}

async function parseBody(response: Response): Promise<unknown> {
  return response.json()
}

/** Error responses can still carry useful JSON (the needs API's 502 lists fallback links); never throws. */
async function errorBody(response: Response): Promise<unknown> {
  try { return await response.json() } catch { return null }
}

/**
 * Cache-first directory fetch for low data mode: a cached answer for the same rounded
 * search shows immediately (stale is explicit — the caller labels it), a background
 * refresh updates the cache and the view when online, and only an empty cache plus a
 * failed request reports failure. With lowData off this is a plain fetch.
 */
export async function fetchDirectory(url: string, options: DirectoryFetchOptions): Promise<DirectoryFetchResult> {
  const fetchImpl = options.fetchImpl ?? fetch
  if (!options.lowData || !options.caches) {
    const response = await fetchImpl(url)
    if (!response.ok) return { ok: false, servedFromCache: false, body: await errorBody(response) }
    const body = await parseBody(response)
    return { ok: true, servedFromCache: false, body, fetchedAt: (body as { fetchedAt?: string })?.fetchedAt }
  }

  const cached = await options.caches.match(url).catch(() => undefined)
  if (cached) {
    const body = await parseBody(cached)
    void fetchImpl(url)
      .then(async (response) => {
        if (!response.ok) return
        await options.caches?.put(url, response.clone())
        const fresh = await parseBody(response)
        options.onRefresh?.({ body: fresh, fetchedAt: (fresh as { fetchedAt?: string })?.fetchedAt })
      })
      .catch(() => undefined)
    return { ok: true, servedFromCache: true, body, fetchedAt: (body as { fetchedAt?: string })?.fetchedAt }
  }

  try {
    const response = await fetchImpl(url)
    if (!response.ok) return { ok: false, servedFromCache: false, body: await errorBody(response) }
    const copy = response.clone()
    const body = await parseBody(response)
    await options.caches.put(url, copy).catch(() => undefined)
    return { ok: true, servedFromCache: false, body, fetchedAt: (body as { fetchedAt?: string })?.fetchedAt }
  } catch {
    return { ok: false, servedFromCache: false, body: null }
  }
}
