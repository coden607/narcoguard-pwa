import assert from "node:assert/strict"
import { test } from "node:test"
import {
  exportAggregates,
  isTelemetryEnabled,
  isValidMetricName,
  pruneTelemetry,
  readTelemetry,
  recordMetric,
  setTelemetryEnabled,
  TELEMETRY_RETENTION_DAYS,
} from "../lib/anonymous-telemetry"

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void }

const memoryStorage = (): StorageLike => {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

const D = (day: string) => `${day}T12:00:00.000Z`

test("telemetry is off by default and recording is a no-op", () => {
  const storage = memoryStorage()
  assert.equal(isTelemetryEnabled(storage), false)
  assert.equal(recordMetric(storage, "feature-useful.proactive-needs", D("2026-10-14")), false)
  assert.equal(readTelemetry(storage).buckets.length, 0)
})

test("explicit opt-in enables recording; opt-out stops it", () => {
  const storage = memoryStorage()
  assert.equal(setTelemetryEnabled(storage, true, D("2026-10-14")), true)
  assert.equal(recordMetric(storage, "feature-useful.proactive-needs", D("2026-10-14")), true)
  assert.equal(setTelemetryEnabled(storage, false, D("2026-10-15")), true)
  assert.equal(recordMetric(storage, "feature-useful.proactive-needs", D("2026-10-15")), false)
  const state = readTelemetry(storage)
  assert.equal(state.enabledAt, D("2026-10-14"))
  assert.equal(state.disabledAt, D("2026-10-15"))
  assert.equal(state.buckets.length, 1)
})

test("repeated set to the same state is a no-op", () => {
  const storage = memoryStorage()
  assert.equal(setTelemetryEnabled(storage, true, D("2026-10-14")), true)
  assert.equal(setTelemetryEnabled(storage, true, D("2026-10-15")), false)
})

test("metric names are constrained to a safe alphabet", () => {
  assert.equal(isValidMetricName("feature-useful.proactive-needs"), true)
  assert.equal(isValidMetricName("abstention.intervention-outcomes"), true)
  assert.equal(isValidMetricName("Moderation Outcome!"), false)
  assert.equal(isValidMetricName("user:42"), false)
  assert.equal(isValidMetricName(""), false)
  assert.equal(isValidMetricName("x".repeat(61)), false)
})

test("same-day increments collapse into one bucket", () => {
  const storage = memoryStorage()
  setTelemetryEnabled(storage, true, D("2026-10-14"))
  recordMetric(storage, "abstention.needs", D("2026-10-14"))
  recordMetric(storage, "abstention.needs", D("2026-10-14"))
  recordMetric(storage, "abstention.needs", D("2026-10-15"))
  const buckets = readTelemetry(storage).buckets
  assert.equal(buckets.length, 2)
  assert.equal(buckets.find((b) => b.day === "2026-10-14")?.count, 2)
})

test("export suppresses cells below k and reports the window", () => {
  const storage = memoryStorage()
  setTelemetryEnabled(storage, true, D("2026-10-10"))
  for (let i = 0; i < 5; i += 1) recordMetric(storage, "feature-useful.x", D("2026-10-12"))
  recordMetric(storage, "feature-useful.y", D("2026-10-13"))
  const exported = exportAggregates(storage, { now: D("2026-10-14") })
  assert.equal(exported.metrics.length, 1)
  assert.equal(exported.metrics[0].name, "feature-useful.x")
  assert.equal(exported.metrics[0].count, 5)
  assert.deepEqual(exported.window, { from: "2026-10-12", to: "2026-10-12" })
  assert.equal(exported.k, 5)
})

test("k below the floor is raised to the minimum", () => {
  const storage = memoryStorage()
  setTelemetryEnabled(storage, true, D("2026-10-10"))
  recordMetric(storage, "m.a", D("2026-10-12"))
  recordMetric(storage, "m.b", D("2026-10-12"))
  const exported = exportAggregates(storage, { now: D("2026-10-14"), k: 1 })
  assert.equal(exported.k, 2)
  assert.equal(exported.metrics.length, 0)
})

test("export payload contains no identifiers beyond schema fields", () => {
  const storage = memoryStorage()
  setTelemetryEnabled(storage, true, D("2026-10-10"))
  for (let i = 0; i < 6; i += 1) recordMetric(storage, "moderation.resolved", D("2026-10-12"))
  const exported = exportAggregates(storage, { now: D("2026-10-14") })
  assert.deepEqual(Object.keys(exported).sort(), ["generatedAt", "k", "metrics", "schema", "window"])
  for (const bucket of exported.metrics) {
    assert.deepEqual(Object.keys(bucket).sort(), ["count", "day", "name"])
    assert.match(bucket.name, /^[a-z0-9][a-z0-9.-]{0,59}$/)
  }
})

test("disabled telemetry exports an empty payload, not an error", () => {
  const storage = memoryStorage()
  recordMetric(storage, "m.a", D("2026-10-12"))
  const exported = exportAggregates(storage, { now: D("2026-10-14") })
  assert.deepEqual(exported.metrics, [])
})

test("retention prunes buckets older than the window", () => {
  const storage = memoryStorage()
  setTelemetryEnabled(storage, true, D("2026-10-14"))
  const old = new Date("2026-10-14T12:00:00.000Z")
  old.setDate(old.getDate() - TELEMETRY_RETENTION_DAYS - 5)
  const state = readTelemetry(storage)
  state.buckets.push({ name: "stale.metric", day: old.toISOString().slice(0, 10), count: 9 })
  storage.setItem("narcoguard_anonymous_telemetry_v1", JSON.stringify(state))
  const removed = pruneTelemetry(storage, D("2026-10-14"))
  assert.equal(removed, 1)
  assert.equal(readTelemetry(storage).buckets.some((b) => b.name === "stale.metric"), false)
})

test("recording prunes implicitly and keeps recent buckets", () => {
  const storage = memoryStorage()
  setTelemetryEnabled(storage, true, D("2026-10-14"))
  const old = new Date("2026-10-14T12:00:00.000Z")
  old.setDate(old.getDate() - TELEMETRY_RETENTION_DAYS - 1)
  // Write an old bucket directly, then record to trigger implicit prune.
  const state = readTelemetry(storage)
  state.buckets.push({ name: "old.metric", day: old.toISOString().slice(0, 10), count: 9 })
  storage.setItem("narcoguard_anonymous_telemetry_v1", JSON.stringify(state))
  recordMetric(storage, "new.metric", D("2026-10-14"))
  const names = readTelemetry(storage).buckets.map((b) => b.name)
  assert.equal(names.includes("old.metric"), false)
  assert.equal(names.includes("new.metric"), true)
})
