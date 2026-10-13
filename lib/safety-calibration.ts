import { NEEDS, type CheckIn, type Need, type PlanItem } from "./guardian-stability"
import { anticipateResourceNeeds, type ProactiveCue } from "./proactive-resource-needs"

/**
 * Safety/fairness calibration harness (Feature 20).
 *
 * Offline evaluation only: this module never writes state, never calls a
 * network, and never infers sensitive attributes. Subgroup tags are supplied
 * by the caller (e.g. self-described context labels) and are never derived
 * from check-in content. Deletion and pause semantics are honored before any
 * metric is computed.
 *
 * The harness replays the existing proactive-cue learner walk-forward over
 * historical check-ins and measures: false alarms, missed cues, calibration
 * error of the implicit binary risk signal, drift between halves of the
 * replay window, subgroup rate deltas, pause/deletion behavior, and
 * notification privacy (no coordinates, dates, times, phones, or postal
 * codes inside cue text).
 */

export interface CalibrationEntry extends CheckIn {
  /** Caller-supplied evaluation tag (e.g. "rural"). Never inferred here. */
  subgroup?: string
  /** Days the user paused cue generation: no cues, excluded from denominators. */
  paused?: boolean
}

export interface CalibrationInput {
  entries: readonly CalibrationEntry[]
  plan?: readonly PlanItem[]
  /** Replay times of day; a cue from any time counts for that day. */
  times?: readonly string[]
  /** Dates whose entries must be treated as deleted before anything runs. */
  deletedDates?: ReadonlySet<string>
  /** Absolute rate delta that flags drift between window halves. */
  driftThreshold?: number
  /** Absolute false-alarm-rate delta that flags a subgroup disparity. */
  subgroupDeltaThreshold?: number
  /** Minimum evaluated days per half/subgroup before a flag may fire. */
  minCells?: number
}

export interface ReplayRecord {
  date: string
  subgroup: string | null
  paused: boolean
  cues: ProactiveCue[]
  /** Ground truth from that day's check-in (post-cue answers). */
  actual: Partial<Record<Need, "met" | "needs-help">>
  /** Needs answered that day (metric denominators). */
  answered: readonly Need[]
}

export interface NeedCalibration {
  need: Need
  answeredDays: number
  cuedDays: number
  falseAlarms: number
  confirmedCues: number
  missedCues: number
  falseAlarmRate: number | null
  missRate: number | null
  /** P(needs-help | cued): the reliability of a raised cue. */
  positivePredictiveValue: number | null
  /** Binary-signal expected calibration error (weighted |acc - conf|). */
  expectedCalibrationError: number | null
}

export interface PrivacyFinding {
  rule: "coordinates" | "iso-date" | "clock-time" | "phone" | "postal-code"
  cueId: string
  excerpt: string
}

export interface HalfMetrics {
  days: number
  falseAlarmRate: number | null
  missRate: number | null
}

export interface SubgroupMetrics {
  name: string
  days: number
  falseAlarmRate: number | null
  missRate: number | null
}

export interface CalibrationSummaryOptions {
  deletedDates?: ReadonlySet<string>
  driftThreshold?: number
  subgroupDeltaThreshold?: number
  minCells?: number
}

export interface CalibrationReport {
  replayedDays: number
  pausedDays: number
  deletionRequested: number
  deletionHonored: boolean
  totalCues: number
  perNeed: NeedCalibration[]
  /** Macro-averaged expected calibration error across needs with data. */
  meanCalibrationError: number | null
  drift: {
    firstHalf: HalfMetrics
    secondHalf: HalfMetrics
    falseAlarmRateDelta: number | null
    missRateDelta: number | null
    driftDetected: boolean
  }
  subgroups: SubgroupMetrics[]
  maxSubgroupFalseAlarmDelta: number | null
  subgroupDisparityFlag: boolean
  privacyViolations: PrivacyFinding[]
  privacyPassed: boolean
}

const DEFAULT_TIMES = ["08:00", "12:00", "19:00"] as const
const UNSPECIFIED = "unspecified"

const isAnswered = (value: unknown): value is "met" | "needs-help" => value === "met" || value === "needs-help"

const rate = (num: number, den: number): number | null => (den > 0 ? num / den : null)

const round = (value: number | null): number | null => (value === null ? null : Math.round(value * 1000) / 1000)

/**
 * Walk-forward replay: each historical day is scored using only entries
 * strictly before it. Paused days emit no cues and never enter denominators.
 * Deleted dates are stripped from history first and must not appear anywhere
 * in the replay output.
 */
export function replayCalibration(input: CalibrationInput): ReplayRecord[] {
  const times = input.times ?? DEFAULT_TIMES
  const deleted = input.deletedDates ?? new Set<string>()
  const history = input.entries
    .filter((entry) => !deleted.has(entry.date))
    .map((entry) => ({ ...entry }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const records: ReplayRecord[] = []
  for (const day of history) {
    const actual: ReplayRecord["actual"] = {}
    const answered: Need[] = []
    for (const need of NEEDS) {
      if (isAnswered(day.needs[need])) {
        actual[need] = day.needs[need] as "met" | "needs-help"
        answered.push(need)
      }
    }
    if (day.paused === true) {
      records.push({ date: day.date, subgroup: day.subgroup ?? null, paused: true, cues: [], actual, answered })
      continue
    }
    const prior = history.filter((entry) => entry.date < day.date)
    const plan = (input.plan ?? []).filter((item) => item.date <= day.date)
    const byNeed = new Map<Need, ProactiveCue>()
    for (const time of times) {
      const cues = anticipateResourceNeeds({
        entries: prior,
        today: { date: day.date, needs: {} },
        plan,
        now: { date: day.date, time },
      })
      for (const cue of cues) if (!byNeed.has(cue.need)) byNeed.set(cue.need, cue)
    }
    records.push({ date: day.date, subgroup: day.subgroup ?? null, paused: false, cues: [...byNeed.values()], actual, answered })
  }
  return records
}

/** Count prior answered days for a need inside the evaluated window only. */
function priorAnswered(evaluated: readonly ReplayRecord[], index: number, need: Need): number {
  let count = 0
  for (let i = 0; i < index; i += 1) {
    if (isAnswered(evaluated[i].actual[need])) count += 1
  }
  return count
}

function collectNeedMetrics(evaluated: readonly ReplayRecord[]): NeedCalibration[] {
  return NEEDS.map((need) => {
    let answeredDays = 0
    let cuedDays = 0
    let falseAlarms = 0
    let confirmed = 0
    let needsHelpDays = 0
    let missed = 0
    evaluated.forEach((record, index) => {
      if (!isAnswered(record.actual[need])) return
      answeredDays += 1
      if (record.actual[need] === "needs-help") needsHelpDays += 1
      const cued = record.cues.some((cue) => cue.need === need)
      if (cued) {
        cuedDays += 1
        if (record.actual[need] === "met") falseAlarms += 1
        else confirmed += 1
      } else if (record.actual[need] === "needs-help" && priorAnswered(evaluated, index, need) >= 2) {
        missed += 1
      }
    })
    let ece: number | null = null
    if (answeredDays > 0) {
      const notCued = answeredDays - cuedDays
      const cuedPositive = cuedDays > 0 ? confirmed / cuedDays : 0
      const notCuedPositive = notCued > 0 ? (needsHelpDays - confirmed) / notCued : 0
      ece = Math.round(((cuedDays / answeredDays) * Math.abs(cuedPositive - 1) + (notCued / answeredDays) * Math.abs(notCuedPositive - 0)) * 1000) / 1000
    }
    return {
      need,
      answeredDays,
      cuedDays,
      falseAlarms,
      confirmedCues: confirmed,
      missedCues: missed,
      falseAlarmRate: round(rate(falseAlarms, cuedDays)),
      missRate: round(rate(missed, answeredDays)),
      positivePredictiveValue: round(rate(confirmed, cuedDays)),
      expectedCalibrationError: ece,
    }
  })
}

function collectWindowMetrics(rows: readonly ReplayRecord[]): HalfMetrics {
  let fa = 0
  let faDen = 0
  let miss = 0
  let missDen = 0
  for (const record of rows) {
    for (const cue of record.cues) {
      if (isAnswered(record.actual[cue.need])) {
        faDen += 1
        if (record.actual[cue.need] === "met") fa += 1
      }
    }
    for (const need of record.answered) {
      missDen += 1
      if (record.actual[need] === "needs-help" && !record.cues.some((cue) => cue.need === need)) miss += 1
    }
  }
  return { days: rows.length, falseAlarmRate: round(rate(fa, faDen)), missRate: round(rate(miss, missDen)) }
}

export function summarizeCalibration(records: readonly ReplayRecord[], input: CalibrationSummaryOptions = {}): CalibrationReport {
  const driftThreshold = input.driftThreshold ?? 0.25
  const subgroupDeltaThreshold = input.subgroupDeltaThreshold ?? 0.3
  const minCells = input.minCells ?? 5
  const deleted = input.deletedDates ?? new Set<string>()

  const evaluated = records.filter((record) => !record.paused && !deleted.has(record.date))
  const pausedDays = records.filter((record) => record.paused).length

  const perNeed = collectNeedMetrics(evaluated)
  const eces = perNeed.map((row) => row.expectedCalibrationError).filter((v): v is number => v !== null)
  const meanCalibrationError = eces.length > 0 ? Math.round((eces.reduce((a, b) => a + b, 0) / eces.length) * 1000) / 1000 : null

  const mid = Math.floor(evaluated.length / 2)
  const firstHalf = collectWindowMetrics(evaluated.slice(0, mid))
  const secondHalf = collectWindowMetrics(evaluated.slice(mid))
  const faDelta = firstHalf.falseAlarmRate !== null && secondHalf.falseAlarmRate !== null
    ? Math.round(Math.abs(secondHalf.falseAlarmRate - firstHalf.falseAlarmRate) * 1000) / 1000
    : null
  const missDelta = firstHalf.missRate !== null && secondHalf.missRate !== null
    ? Math.round(Math.abs(secondHalf.missRate - firstHalf.missRate) * 1000) / 1000
    : null
  const driftDetected =
    firstHalf.days >= minCells &&
    secondHalf.days >= minCells &&
    ((faDelta !== null && faDelta > driftThreshold) || (missDelta !== null && missDelta > driftThreshold))

  const subgroupNames = [...new Set(evaluated.map((record) => record.subgroup ?? UNSPECIFIED))]
  const subgroups: SubgroupMetrics[] = subgroupNames.map((name) => {
    const rows = evaluated.filter((record) => (record.subgroup ?? UNSPECIFIED) === name)
    const metrics = collectWindowMetrics(rows)
    return { name, days: rows.length, falseAlarmRate: metrics.falseAlarmRate, missRate: metrics.missRate }
  })
  const flagged = subgroups.filter((row) => row.days >= minCells && row.falseAlarmRate !== null)
  let maxSubgroupFalseAlarmDelta: number | null = null
  for (let i = 0; i < flagged.length; i += 1) {
    for (let j = i + 1; j < flagged.length; j += 1) {
      const delta = Math.round(Math.abs((flagged[i].falseAlarmRate ?? 0) - (flagged[j].falseAlarmRate ?? 0)) * 1000) / 1000
      maxSubgroupFalseAlarmDelta = maxSubgroupFalseAlarmDelta === null ? delta : Math.max(maxSubgroupFalseAlarmDelta, delta)
    }
  }
  const subgroupDisparityFlag = maxSubgroupFalseAlarmDelta !== null && maxSubgroupFalseAlarmDelta > subgroupDeltaThreshold

  const allCues = evaluated.flatMap((record) => record.cues)
  const privacyViolations = lintCuePrivacy(allCues)
  const deletionHonored = records.every((record) => !deleted.has(record.date))

  return {
    replayedDays: records.length,
    pausedDays,
    deletionRequested: deleted.size,
    deletionHonored,
    totalCues: allCues.length,
    perNeed,
    meanCalibrationError,
    drift: { firstHalf, secondHalf, falseAlarmRateDelta: faDelta, missRateDelta: missDelta, driftDetected },
    subgroups,
    maxSubgroupFalseAlarmDelta,
    subgroupDisparityFlag,
    privacyViolations,
    privacyPassed: privacyViolations.length === 0,
  }
}

const PRIVACY_RULES: Array<{ rule: PrivacyFinding["rule"]; pattern: RegExp }> = [
  { rule: "coordinates", pattern: /-?\d{1,3}\.\d{4,},\s*-?\d{1,3}\.\d{4,}/ },
  { rule: "iso-date", pattern: /\b\d{4}-\d{2}-\d{2}\b/ },
  { rule: "clock-time", pattern: /\b\d{1,2}:\d{2}\b/ },
  { rule: "phone", pattern: /\+?1?[\s().-]?\d{3}[\s().-]\d{3}[\s().-]\d{4}/ },
  { rule: "postal-code", pattern: /\b\d{5}(-\d{4})?\b/ },
]

/** Scans cue text for location/time/identity leaks. Cues are planning nudges, not data dumps. */
export function lintCuePrivacy(cues: readonly ProactiveCue[]): PrivacyFinding[] {
  const findings: PrivacyFinding[] = []
  for (const cue of cues) {
    const text = `${cue.title}\n${cue.detail}`
    for (const { rule, pattern } of PRIVACY_RULES) {
      const match = text.match(pattern)
      if (match) {
        findings.push({ rule, cueId: cue.id, excerpt: String(match[0]).slice(0, 40) })
      }
    }
  }
  return findings
}

/** Convenience: replay + summarize in one call. Pure; safe for CI and local audits. */
export function runCalibrationHarness(input: CalibrationInput): { records: ReplayRecord[]; report: CalibrationReport } {
  const records = replayCalibration(input)
  return { records, report: summarizeCalibration(records, input) }
}
