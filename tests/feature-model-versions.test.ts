import assert from "node:assert/strict"
import { test } from "node:test"
import {
  activeBundle,
  canonicalJson,
  createBundle,
  defaultIntegrity,
  detectRegression,
  diffPayloads,
  fnv1aHex,
  getChangelog,
  installBundle,
  readRegistry,
  rollbackIfRegression,
  verifyBundle,
  type LearnerBundle,
  type RegressionSignal,
  type SimpleStorage,
} from "../lib/model-versions"

const memoryStorage = (): SimpleStorage => {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

const SECRET = "test-secret"
const bundle = (version: string, payload: Record<string, unknown> = { weights: [1, 2, 3] }): LearnerBundle =>
  createBundle({ learner: "proactive-resource-needs", version, payload, secret: SECRET, releasedAt: `2026-10-${String(10 + version.split(".").map(Number).reduce((a, b) => a + b, 0)).padStart(2, "0")}T00:00:00.000Z` })

test("createBundle roundtrips verification with the same secret", () => {
  const created = bundle("1.0.0")
  assert.equal(verifyBundle(created, SECRET), true)
})

test("tampered payload fails verification", () => {
  const created = bundle("1.0.0")
  created.payload.weights = [9, 9, 9]
  assert.equal(verifyBundle(created, SECRET), false)
})

test("wrong secret fails verification", () => {
  const created = bundle("1.0.0")
  assert.equal(verifyBundle(created, "other-secret"), false)
})

test("canonical JSON is independent of key insertion order", () => {
  const a = canonicalJson({ b: 2, a: { d: 4, c: 3 } })
  const b = canonicalJson({ a: { c: 3, d: 4 }, b: 2 })
  assert.equal(a, b)
  assert.equal(fnv1aHex(a), fnv1aHex(b))
})

test("install activates the bundle and appends a changelog entry", () => {
  const storage = memoryStorage()
  const first = bundle("1.0.0")
  const result = installBundle(storage, first, { secret: SECRET, reason: "initial release" })
  assert.equal(result.ok, true)
  assert.equal(result.entry.action, "install")
  assert.equal(result.entry.fromVersion, null)
  assert.equal(result.entry.toVersion, "1.0.0")
  assert.equal(activeBundle(storage, "proactive-resource-needs")?.manifest.version, "1.0.0")
})

test("duplicate version for the same learner is rejected and logged", () => {
  const storage = memoryStorage()
  installBundle(storage, bundle("1.0.0"), { secret: SECRET })
  const again = installBundle(storage, bundle("1.0.0"), { secret: SECRET })
  assert.equal(again.ok, false)
  assert.equal(again.entry.action, "reject")
  assert.match(again.entry.reason, /duplicate version/)
  assert.equal(readRegistry(storage).bundles.length, 1)
})

test("unverifiable bundle is rejected and logged", () => {
  const storage = memoryStorage()
  const bad = bundle("1.0.0")
  bad.payload = { corrupted: true }
  const result = installBundle(storage, bad, { secret: SECRET })
  assert.equal(result.ok, false)
  assert.equal(result.entry.action, "reject")
  assert.match(result.entry.reason, /verification failed/)
  assert.equal(activeBundle(storage, "proactive-resource-needs"), null)
})

test("retention prunes oldest versions but never the active bundle", () => {
  const storage = memoryStorage()
  installBundle(storage, bundle("1.0.0"), { secret: SECRET, maxRetained: 3 })
  installBundle(storage, bundle("1.1.0"), { secret: SECRET, maxRetained: 3 })
  installBundle(storage, bundle("1.2.0"), { secret: SECRET, maxRetained: 3 })
  installBundle(storage, bundle("1.3.0"), { secret: SECRET, maxRetained: 3 })
  installBundle(storage, bundle("1.4.0"), { secret: SECRET, maxRetained: 3 })
  const state = readRegistry(storage)
  assert.equal(state.bundles.length, 3)
  assert.equal(state.active["proactive-resource-needs"], "1.4.0")
  assert.deepEqual(state.bundles.map((b) => b.manifest.version).sort(), ["1.2.0", "1.3.0", "1.4.0"])
})

test("rollback reverts to the newest prior verified bundle with the reason", () => {
  const storage = memoryStorage()
  installBundle(storage, bundle("1.0.0"), { secret: SECRET })
  installBundle(storage, bundle("1.1.0"), { secret: SECRET })
  const report: RegressionSignal = { privacyPassed: false, drift: { driftDetected: false }, subgroupDisparityFlag: false, meanCalibrationError: null }
  const result = rollbackIfRegression(storage, report, { learner: "proactive-resource-needs", secret: SECRET, at: "2026-10-14T00:00:00.000Z" })
  assert.equal(result.rolledBack, true)
  assert.equal(result.activeVersion, "1.0.0")
  assert.equal(result.entry?.action, "rollback")
  assert.equal(result.entry?.fromVersion, "1.1.0")
  assert.equal(result.entry?.toVersion, "1.0.0")
  assert.match(result.entry?.reason ?? "", /privacy/)
  assert.equal(activeBundle(storage, "proactive-resource-needs")?.manifest.version, "1.0.0")
})

test("clean calibration report never rolls back", () => {
  const storage = memoryStorage()
  installBundle(storage, bundle("1.0.0"), { secret: SECRET })
  installBundle(storage, bundle("1.1.0"), { secret: SECRET })
  const report: RegressionSignal = { privacyPassed: true, drift: { driftDetected: false }, subgroupDisparityFlag: false, meanCalibrationError: 0.12 }
  const result = rollbackIfRegression(storage, report, { learner: "proactive-resource-needs", secret: SECRET })
  assert.equal(result.rolledBack, false)
  assert.equal(result.entry, null)
  assert.equal(activeBundle(storage, "proactive-resource-needs")?.manifest.version, "1.1.0")
})

test("regression with a single installed version abstains and logs why", () => {
  const storage = memoryStorage()
  installBundle(storage, bundle("1.0.0"), { secret: SECRET })
  const report: RegressionSignal = { privacyPassed: false, drift: { driftDetected: false }, subgroupDisparityFlag: false, meanCalibrationError: null }
  const result = rollbackIfRegression(storage, report, { learner: "proactive-resource-needs", secret: SECRET })
  assert.equal(result.rolledBack, false)
  assert.equal(result.entry?.action, "reject")
  assert.match(result.entry?.reason ?? "", /no prior verified bundle/)
  assert.equal(activeBundle(storage, "proactive-resource-needs")?.manifest.version, "1.0.0")
})

test("high mean calibration error alone counts as a regression", () => {
  const result = detectRegression({ privacyPassed: true, drift: { driftDetected: false }, subgroupDisparityFlag: false, meanCalibrationError: 0.61 })
  assert.equal(result.regression, true)
  assert.match(result.reasons[0], /calibration error 0.61/)
})

test("drift and subgroup flags produce distinct reasons", () => {
  const result = detectRegression({ privacyPassed: true, drift: { driftDetected: true }, subgroupDisparityFlag: true, meanCalibrationError: null })
  assert.equal(result.regression, true)
  assert.equal(result.reasons.length, 2)
})

test("diffPayloads reports added, removed, and changed keys", () => {
  const diff = diffPayloads({ keep: 1, change: "a", drop: true }, { keep: 1, change: "b", fresh: null })
  assert.deepEqual(diff.added, ["fresh"])
  assert.deepEqual(diff.removed, ["drop"])
  assert.deepEqual(diff.changed, ["change"])
})

test("changelog persists across storage reads and is learner-filterable", () => {
  const storage = memoryStorage()
  installBundle(storage, bundle("1.0.0"), { secret: SECRET, at: "2026-10-10T00:00:00.000Z" })
  installBundle(storage, bundle("1.1.0"), { secret: SECRET, at: "2026-10-11T00:00:00.000Z" })
  const other = createBundle({ learner: "intervention-outcomes", version: "2.0.0", payload: { x: 1 }, secret: SECRET, releasedAt: "2026-10-12T00:00:00.000Z" })
  installBundle(storage, other, { secret: SECRET, at: "2026-10-12T00:00:00.000Z" })
  const all = getChangelog(storage)
  assert.equal(all.length, 3)
  const learnerLog = getChangelog(storage, "proactive-resource-needs")
  assert.equal(learnerLog.length, 2)
  assert.deepEqual(learnerLog.map((entry) => entry.action), ["install", "install"])
})

test("injected integrity functions are used end to end", () => {
  const integrity = {
    hash: (text: string) => `h:${text.length}`,
    sign: (text: string, secret: string) => `s:${secret}:${text.length}`,
  }
  const created = createBundle({ learner: "proactive-resource-needs", version: "3.0.0", payload: { a: 1 }, secret: SECRET, integrity, releasedAt: "2026-10-13T00:00:00.000Z" })
  assert.equal(verifyBundle(created, SECRET, integrity), true)
  assert.equal(verifyBundle(created, SECRET, defaultIntegrity), false)
})

test("corrupt registry JSON reads as empty rather than throwing", () => {
  const storage = memoryStorage()
  storage.setItem("narcoguard_model_registry_v1", "{not json")
  assert.equal(readRegistry(storage).bundles.length, 0)
})
