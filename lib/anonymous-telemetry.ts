/**
 * Anonymous quality telemetry (Feature 25).
 *
 * Opt-in aggregate counters for feature usefulness, learner abstention
 * rates, and moderation outcomes. Hard boundaries:
 *
 * - Telemetry is OFF by default; enabling is an explicit consent action
 *   that is itself recorded with a timestamp.
 * - Events are counters only. No user ids, no device ids, no content
 *   payloads, no timestamps finer than a day.
 * - Export suppresses any (metric, day) cell below the k threshold, so a
 *   single person's day cannot be distinguished in the output.
 * - Buckets older than the retention window are pruned on write.
 *
 * Aggregation happens on-device; whatever the caller does with the export
 * payload is outside this module.
 */

export const TELEMETRY_KEY = "narcoguard_anonymous_telemetry_v1"
export const TELEMETRY_RETENTION_DAYS = 90
export const TELEMETRY_K_DEFAULT = 5
export const TELEMETRY_K_MIN = 2
export const TELEMETRY_METRIC_MAX = 60

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface TelemetryBucket {
  name: string
  /** YYYY-MM-DD; day granularity is the finest this system keeps. */
  day: string
  count: number
}

interface TelemetryState {
  version: 1
  enabled: boolean
  enabledAt: string | null
  disabledAt: string | null
  buckets: TelemetryBucket[]
}

const emptyState = (): TelemetryState => ({
  version: 1,
  enabled: false,
  enabledAt: null,
  disabledAt: null,
  buckets: [],
})

export function readTelemetry(storage: StorageLike): TelemetryState {
  try {
    const raw = storage.getItem(TELEMETRY_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<TelemetryState>
    if (parsed?.version !== 1) return emptyState()
    return {
      ...emptyState(),
      enabled: parsed.enabled === true,
      enabledAt: typeof parsed.enabledAt === "string" ? parsed.enabledAt : null,
      disabledAt: typeof parsed.disabledAt === "string" ? parsed.disabledAt : null,
      buckets: Array.isArray(parsed.buckets) ? parsed.buckets.filter(isBucket) : [],
    }
  } catch {
    return emptyState()
  }
}

function isBucket(value: unknown): value is TelemetryBucket {
  if (!value || typeof value !== "object") return false
  const bucket = value as TelemetryBucket
  return (
    typeof bucket.name === "string" &&
    typeof bucket.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(bucket.day) &&
    typeof bucket.count === "number" &&
    Number.isInteger(bucket.count) &&
    bucket.count > 0
  )
}

function writeTelemetry(storage: StorageLike, state: TelemetryState): void {
  storage.setItem(TELEMETRY_KEY, JSON.stringify(state))
}

/** Metric names are constrained so arbitrary strings can never become a side channel. */
export function isValidMetricName(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9][a-z0-9.-]{0,59}$/.test(value)
}

export const dayStamp = (at: string): string => at.slice(0, 10)

export function isTelemetryEnabled(storage: StorageLike): boolean {
  return readTelemetry(storage).enabled
}

/** Explicit opt-in. Returns false if already in the requested state. */
export function setTelemetryEnabled(storage: StorageLike, enabled: boolean, at = new Date().toISOString()): boolean {
  const state = readTelemetry(storage)
  if (state.enabled === enabled) return false
  state.enabled = enabled
  if (enabled) {
    state.enabledAt = at
    state.disabledAt = null
  } else {
    state.disabledAt = at
  }
  writeTelemetry(storage, state)
  return true
}

/** Increment a counter bucket. No-op when telemetry is off or the name is invalid. */
export function recordMetric(storage: StorageLike, name: string, at = new Date().toISOString()): boolean {
  if (!isValidMetricName(name)) return false
  const state = readTelemetry(storage)
  if (!state.enabled) return false
  pruneState(state, at)
  const day = dayStamp(at)
  const existing = state.buckets.find((bucket) => bucket.name === name && bucket.day === day)
  if (existing) existing.count += 1
  else state.buckets.push({ name, day, count: 1 })
  writeTelemetry(storage, state)
  return true
}

function pruneState(state: TelemetryState, now: string): void {
  const cutoff = Date.parse(now) - TELEMETRY_RETENTION_DAYS * 24 * 60 * 60 * 1000
  state.buckets = state.buckets.filter((bucket) => Date.parse(`${bucket.day}T00:00:00.000Z`) >= cutoff)
}

export interface TelemetryExport {
  schema: 1
  generatedAt: string
  window: { from: string; to: string }
  k: number
  metrics: TelemetryBucket[]
}

export interface ExportOptions {
  now?: string
  k?: number
}

/**
 * Aggregate export. Cells below k are suppressed entirely — absence means
 * "insufficient data", never zero. No identifiers of any kind are included.
 */
export function exportAggregates(storage: StorageLike, options: ExportOptions = {}): TelemetryExport {
  const now = options.now ?? new Date().toISOString()
  const k = Math.max(TELEMETRY_K_MIN, Math.floor(options.k ?? TELEMETRY_K_DEFAULT))
  const state = readTelemetry(storage)
  const visible = state.enabled ? state.buckets.filter((bucket) => bucket.count >= k) : []
  const days = visible.map((bucket) => bucket.day).sort()
  return {
    schema: 1,
    generatedAt: now,
    window: { from: days[0] ?? dayStamp(now), to: days[days.length - 1] ?? dayStamp(now) },
    k,
    metrics: visible.sort((a, b) => a.name.localeCompare(b.name) || a.day.localeCompare(b.day)),
  }
}

/** Manual prune; also runs implicitly on every recorded metric. */
export function pruneTelemetry(storage: StorageLike, now = new Date().toISOString()): number {
  const state = readTelemetry(storage)
  const before = state.buckets.length
  pruneState(state, now)
  writeTelemetry(storage, state)
  return before - state.buckets.length
}
