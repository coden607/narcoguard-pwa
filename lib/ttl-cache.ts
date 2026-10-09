// A small in-memory cache for public directory answers, so a repeat search in the same area answers instantly.
// Keys are public directory URLs and queries built from coordinates already rounded to about 1 km; nothing
// personal is stored, and entries live only in this server instance's memory for a few minutes.

interface Entry<T> { value: T; expires: number }

export class TtlCache<T> {
  private readonly entries = new Map<string, Entry<T>>()
  private readonly inFlight = new Map<string, Promise<T>>()

  constructor(private readonly ttlMs: number, private readonly maxEntries = 300) {}

  /** Returns a fresh cached value, joins an identical request already running, or runs `load` once. Failures are not cached. */
  get(key: string, load: () => Promise<T>, now = Date.now()): Promise<T> {
    const hit = this.entries.get(key)
    if (hit && hit.expires > now) return Promise.resolve(hit.value)
    if (hit) this.entries.delete(key)
    const running = this.inFlight.get(key)
    if (running) return running
    const promise = load()
      .then((value) => {
        if (this.entries.size >= this.maxEntries) this.entries.delete(this.entries.keys().next().value as string)
        this.entries.set(key, { value, expires: Date.now() + this.ttlMs })
        return value
      })
      .finally(() => this.inFlight.delete(key))
    this.inFlight.set(key, promise)
    return promise
  }

  clear() {
    this.entries.clear()
    this.inFlight.clear()
  }

  get size() {
    return this.entries.size
  }
}
