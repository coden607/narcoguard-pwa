// After a new deployment goes live, a tab or installed app that is still running the previous
// build asks for JavaScript chunks the new deployment no longer serves. The bundler then throws a
// ChunkLoadError and the page shows the error screen. One fresh load fetches the current build and
// fixes it, so recover with a single automatic reload instead of leaving the person on an error.

export const CHUNK_RELOAD_KEY = "narcoguard_chunk_reload_at_v1"
/** Do not reload again within this window, so a real outage cannot cause a reload loop. */
export const CHUNK_RELOAD_COOLDOWN_MS = 60_000

const CHUNK_ERROR_PATTERN = /ChunkLoadError|Loading (?:CSS )?chunk [\w-]+ failed|Failed to load chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i

export function isChunkLoadError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === "string") return CHUNK_ERROR_PATTERN.test(error)
  if (typeof error !== "object") return false
  const { name, message } = error as { name?: unknown; message?: unknown }
  if (name === "ChunkLoadError") return true
  return typeof message === "string" && CHUNK_ERROR_PATTERN.test(message)
}

type ReloadEnv = {
  storage?: Pick<Storage, "getItem" | "setItem"> | null
  now?: () => number
  reload?: () => void
}

/**
 * Reload once when the error is a stale-chunk failure. Returns true when a reload was started.
 * The last attempt is kept in sessionStorage; without storage nothing is reloaded, which avoids loops.
 */
export function reloadOnceForChunkError(error: unknown, env: ReloadEnv = {}): boolean {
  if (!isChunkLoadError(error)) return false
  let storage = env.storage
  if (storage === undefined) {
    try { storage = typeof window === "undefined" ? null : window.sessionStorage } catch { storage = null }
  }
  if (!storage) return false
  const now = (env.now ?? Date.now)()
  try {
    const last = Number(storage.getItem(CHUNK_RELOAD_KEY))
    if (Number.isFinite(last) && last > 0 && now - last < CHUNK_RELOAD_COOLDOWN_MS) return false
    storage.setItem(CHUNK_RELOAD_KEY, String(now))
  } catch {
    return false
  }
  const reload = env.reload ?? (() => window.location.reload())
  reload()
  return true
}
