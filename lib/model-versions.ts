import type { CalibrationReport } from "./safety-calibration"

/**
 * On-device model changelog + rollback (Feature 21).
 *
 * Versioned learner bundles with integrity-checked manifests. Installing a
 * bundle verifies its manifest against the payload, appends an auditable
 * changelog entry, and prunes old versions per learner. When the Feature 20
 * calibration harness reports a regression, `rollbackIfRegression` reverts
 * the named learner to the newest prior verified bundle and records why, so
 * the transparency dashboard can show the reason.
 *
 * Honest boundary: the default integrity scheme (FNV-1a) detects accidental
 * corruption and keeps an audit trail. It is not a cryptographic defense
 * against an actor with device access. Callers needing stronger guarantees
 * can inject their own hash/sign functions (e.g. Web Crypto HMAC).
 *
 * Storage is an injected key-value adapter (localStorage-compatible), so the
 * module stays pure and testable offline.
 */

export interface SimpleStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export interface LearnerManifest {
  version: string
  /** Learner id, e.g. "proactive-resource-needs". */
  learner: string
  releasedAt: string
  notes: string
  integrityHash: string
  signature: string
}

export interface LearnerBundle {
  manifest: LearnerManifest
  /** Opaque learner state/weights. Treated as an immutable blob. */
  payload: Record<string, unknown>
}

export interface ChangelogEntry {
  at: string
  action: "install" | "rollback" | "activate" | "reject"
  learner: string
  fromVersion: string | null
  toVersion: string | null
  /** Human-readable reason; surfaced by the transparency dashboard. */
  reason: string
}

export interface ModelRegistryState {
  schema: 1
  /** Active bundle version per learner. */
  active: Record<string, string>
  bundles: LearnerBundle[]
  log: ChangelogEntry[]
}

export interface IntegrityFns {
  hash: (text: string) => string
  sign: (text: string, secret: string) => string
}

export const MODEL_REGISTRY_KEY = "narcoguard_model_registry_v1"
const DEFAULT_MAX_RETAINED = 3

/** FNV-1a 32-bit, hex-encoded. Dependency-free; see module honesty note. */
export function fnv1aHex(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, "0")
}

export const defaultIntegrity: IntegrityFns = {
  hash: fnv1aHex,
  sign: (text, secret) => fnv1aHex(`${secret}:${text}`),
}

/** Stable stringify: object keys sorted recursively so hashes are order-independent. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  const record = value as Record<string, unknown>
  const keys = Object.keys(record).sort()
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`
}

const manifestLine = (manifest: Omit<LearnerManifest, "signature">): string =>
  [manifest.learner, manifest.version, manifest.releasedAt, manifest.notes, manifest.integrityHash].join("|")

export interface CreateBundleInput {
  learner: string
  version: string
  payload: Record<string, unknown>
  secret: string
  notes?: string
  releasedAt?: string
  integrity?: IntegrityFns
}

export function createBundle(input: CreateBundleInput): LearnerBundle {
  const integrity = input.integrity ?? defaultIntegrity
  const releasedAt = input.releasedAt ?? new Date().toISOString()
  const base: Omit<LearnerManifest, "signature"> = {
    learner: input.learner,
    version: input.version,
    releasedAt,
    notes: input.notes ?? "",
    integrityHash: integrity.hash(canonicalJson(input.payload)),
  }
  return {
    manifest: { ...base, signature: integrity.sign(manifestLine(base), input.secret) },
    payload: input.payload,
  }
}

export function verifyBundle(bundle: LearnerBundle, secret: string, integrity: IntegrityFns = defaultIntegrity): boolean {
  const { manifest, payload } = bundle
  if (typeof manifest.version !== "string" || manifest.version.length === 0) return false
  if (typeof manifest.learner !== "string" || manifest.learner.length === 0) return false
  const base: Omit<LearnerManifest, "signature"> = {
    learner: manifest.learner,
    version: manifest.version,
    releasedAt: manifest.releasedAt,
    notes: manifest.notes,
    integrityHash: manifest.integrityHash,
  }
  return (
    manifest.integrityHash === integrity.hash(canonicalJson(payload)) &&
    manifest.signature === integrity.sign(manifestLine(base), secret)
  )
}

const emptyState = (): ModelRegistryState => ({ schema: 1, active: {}, bundles: [], log: [] })

export function readRegistry(storage: SimpleStorage, key: string = MODEL_REGISTRY_KEY): ModelRegistryState {
  try {
    const raw = storage.getItem(key)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<ModelRegistryState>
    if (parsed?.schema !== 1 || !Array.isArray(parsed.bundles) || !Array.isArray(parsed.log) || typeof parsed.active !== "object" || parsed.active === null) {
      return emptyState()
    }
    return parsed as ModelRegistryState
  } catch {
    return emptyState()
  }
}

export function writeRegistry(storage: SimpleStorage, state: ModelRegistryState, key: string = MODEL_REGISTRY_KEY): void {
  storage.setItem(key, JSON.stringify(state))
}

export function activeBundle(storage: SimpleStorage, learner: string): LearnerBundle | null {
  const state = readRegistry(storage)
  const version = state.active[learner]
  if (!version) return null
  return state.bundles.find((bundle) => bundle.manifest.learner === learner && bundle.manifest.version === version) ?? null
}

export function getChangelog(storage: SimpleStorage, learner?: string): ChangelogEntry[] {
  const log = readRegistry(storage).log
  return learner ? log.filter((entry) => entry.learner === learner) : log
}

export interface InstallResult {
  ok: boolean
  entry: ChangelogEntry
  state: ModelRegistryState
}

export interface InstallOptions {
  secret: string
  maxRetained?: number
  reason?: string
  integrity?: IntegrityFns
  at?: string
}

/**
 * Verifies and installs a bundle. Rejects duplicate versions for the same
 * learner and unverifiable manifests (both logged). Retention keeps the
 * active bundle plus the newest backups; pruning never drops the active one.
 */
export function installBundle(storage: SimpleStorage, bundle: LearnerBundle, options: InstallOptions): InstallResult {
  const state = readRegistry(storage)
  const at = options.at ?? new Date().toISOString()
  const { learner, version } = bundle.manifest
  const log = (action: ChangelogEntry["action"], fromVersion: string | null, toVersion: string | null, reason: string): ChangelogEntry => ({
    at, action, learner, fromVersion, toVersion, reason,
  })

  if (!verifyBundle(bundle, options.secret, options.integrity ?? defaultIntegrity)) {
    const entry = log("reject", state.active[learner] ?? null, version, "manifest verification failed")
    state.log.push(entry)
    writeRegistry(storage, state)
    return { ok: false, entry, state }
  }
  if (state.bundles.some((existing) => existing.manifest.learner === learner && existing.manifest.version === version)) {
    const entry = log("reject", state.active[learner] ?? null, version, `duplicate version ${version} for learner ${learner}`)
    state.log.push(entry)
    writeRegistry(storage, state)
    return { ok: false, entry, state }
  }

  const fromVersion = state.active[learner] ?? null
  state.bundles.push(bundle)
  state.active[learner] = version
  state.log.push(log("install", fromVersion, version, options.reason ?? `installed ${version}`))

  const maxRetained = Math.max(2, options.maxRetained ?? DEFAULT_MAX_RETAINED)
  const forLearner = state.bundles
    .filter((existing) => existing.manifest.learner === learner)
    .sort((a, b) => b.manifest.releasedAt.localeCompare(a.manifest.releasedAt))
  const excess = forLearner.length - maxRetained
  if (excess > 0) {
    const drop = new Set(forLearner.slice(maxRetained).map((existing) => existing.manifest.version))
    state.bundles = state.bundles.filter((existing) => !(existing.manifest.learner === learner && drop.has(existing.manifest.version)))
  }

  writeRegistry(storage, state)
  return { ok: true, entry: state.log[state.log.length - 1], state }
}

/** Minimal regression surface from the Feature 20 calibration report. */
export type RegressionSignal = Pick<
  CalibrationReport,
  "privacyPassed" | "subgroupDisparityFlag" | "meanCalibrationError"
> & {
  drift?: { driftDetected?: boolean } | null
}

export interface RegressionResult {
  regression: boolean
  reasons: string[]
}

export interface RegressionOptions {
  /** ECE above this value counts as a regression when data exists. */
  eceThreshold?: number
}

/**
 * Conservative triggers: privacy violations, harness-detected drift, subgroup
 * disparity, or high calibration error. Absent data abstains rather than
 * inventing a signal.
 */
export function detectRegression(report: RegressionSignal, options: RegressionOptions = {}): RegressionResult {
  const reasons: string[] = []
  if (report.privacyPassed === false) reasons.push("notification privacy lint failed")
  if (report.drift?.driftDetected === true) reasons.push("calibration drift detected")
  if (report.subgroupDisparityFlag === true) reasons.push("subgroup false-alarm disparity detected")
  const eceThreshold = options.eceThreshold ?? 0.4
  if (report.meanCalibrationError !== null && report.meanCalibrationError > eceThreshold) {
    reasons.push(`mean calibration error ${report.meanCalibrationError} exceeds ${eceThreshold}`)
  }
  return { regression: reasons.length > 0, reasons }
}

export interface RollbackOptions extends RegressionOptions {
  learner: string
  secret: string
  integrity?: IntegrityFns
  at?: string
}

export interface RollbackResult {
  rolledBack: boolean
  reasons: string[]
  entry: ChangelogEntry | null
  activeVersion: string | null
}

/**
 * Reverts the named learner to the newest prior verified bundle when the
 * calibration report shows a regression. Abstains (no state change) when the
 * report is clean or no prior verified bundle exists.
 */
export function rollbackIfRegression(storage: SimpleStorage, report: RegressionSignal, options: RollbackOptions): RollbackResult {
  const state = readRegistry(storage)
  const activeVersion = state.active[options.learner] ?? null
  const { regression, reasons } = detectRegression(report, options)
  if (!regression) {
    return { rolledBack: false, reasons: [], entry: null, activeVersion }
  }
  const reason = reasons.join("; ")
  const candidates = state.bundles
    .filter((bundle) => bundle.manifest.learner === options.learner && bundle.manifest.version !== activeVersion)
    .sort((a, b) => b.manifest.releasedAt.localeCompare(a.manifest.releasedAt))
  const target = candidates.find((bundle) => verifyBundle(bundle, options.secret, options.integrity ?? defaultIntegrity))
  if (!target || activeVersion === null) {
    const entry: ChangelogEntry = {
      at: options.at ?? new Date().toISOString(),
      action: "reject",
      learner: options.learner,
      fromVersion: activeVersion,
      toVersion: null,
      reason: `regression detected but no prior verified bundle to roll back to (${reason})`,
    }
    state.log.push(entry)
    writeRegistry(storage, state)
    return { rolledBack: false, reasons, entry, activeVersion }
  }
  state.active[options.learner] = target.manifest.version
  const entry: ChangelogEntry = {
    at: options.at ?? new Date().toISOString(),
    action: "rollback",
    learner: options.learner,
    fromVersion: activeVersion,
    toVersion: target.manifest.version,
    reason,
  }
  state.log.push(entry)
  writeRegistry(storage, state)
  return { rolledBack: true, reasons, entry, activeVersion: target.manifest.version }
}

export interface PayloadDiff {
  added: string[]
  removed: string[]
  changed: string[]
}

/** Top-level payload key comparison for the transparency dashboard. */
export function diffPayloads(a: Record<string, unknown>, b: Record<string, unknown>): PayloadDiff {
  const keysA = new Set(Object.keys(a))
  const keysB = new Set(Object.keys(b))
  const added = [...keysB].filter((key) => !keysA.has(key)).sort()
  const removed = [...keysA].filter((key) => !keysB.has(key)).sort()
  const changed = [...keysA].filter((key) => keysB.has(key) && canonicalJson(a[key]) !== canonicalJson(b[key])).sort()
  return { added, removed, changed }
}
