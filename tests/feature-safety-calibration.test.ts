import assert from "node:assert/strict"
import { test } from "node:test"
import {
  lintCuePrivacy,
  replayCalibration,
  runCalibrationHarness,
  summarizeCalibration,
  type CalibrationEntry,
} from "../lib/safety-calibration"

const day = (offset: number) => {
  const value = new Date("2026-09-01T12:00:00")
  value.setDate(value.getDate() + offset)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
}

const entry = (offset: number, needs: CalibrationEntry["needs"], extra: Partial<CalibrationEntry> = {}): CalibrationEntry => ({
  date: day(offset),
  needs,
  ...extra,
})

/** Days 0-2 food needs-help build evidence; day 3 met (false alarm); day 4 needs-help (confirmed). */
const falseAlarmFixture = (): CalibrationEntry[] => [
  entry(0, { food: "needs-help" }),
  entry(1, { food: "needs-help" }),
  entry(2, { food: "needs-help" }),
  entry(3, { food: "met" }),
  entry(4, { food: "needs-help" }),
]

test("replay is walk-forward: no cues before minimum evidence exists", () => {
  const records = replayCalibration({ entries: falseAlarmFixture() })
  assert.equal(records.length, 5)
  assert.equal(records[0].cues.length, 0)
  assert.equal(records[1].cues.length, 0)
  assert.ok(records[2].cues.some((cue) => cue.need === "food"))
})

test("false alarms and confirmed cues are counted per need", () => {
  const { report } = runCalibrationHarness({ entries: falseAlarmFixture() })
  const food = report.perNeed.find((row) => row.need === "food")!
  assert.equal(report.totalCues, 3)
  assert.equal(food.cuedDays, 3)
  assert.equal(food.falseAlarms, 1)
  assert.equal(food.confirmedCues, 2)
  assert.equal(food.falseAlarmRate, 0.333)
  assert.equal(food.positivePredictiveValue, 0.667)
})

test("expected calibration error matches hand-computed value", () => {
  const { report } = runCalibrationHarness({ entries: falseAlarmFixture() })
  const food = report.perNeed.find((row) => row.need === "food")!
  // cued: 2/3 positive; not cued (days 0-1): both needs-help; ECE = 3/5*1/3 + 2/5*1 = 0.6
  assert.equal(food.expectedCalibrationError, 0.6)
  assert.equal(report.meanCalibrationError !== null, true)
})

test("early needs-help without evidence is abstention, not a miss", () => {
  const { report } = runCalibrationHarness({ entries: falseAlarmFixture() })
  const food = report.perNeed.find((row) => row.need === "food")!
  assert.equal(food.missedCues, 0)
  assert.equal(food.missRate, 0)
})

test("missed cue counted when need flips to needs-help without a cue despite evidence", () => {
  const entries: CalibrationEntry[] = [
    entry(0, { hygiene: "met" }),
    entry(1, { hygiene: "met" }),
    entry(2, { hygiene: "needs-help" }),
    entry(3, { hygiene: "met" }),
    entry(4, { hygiene: "needs-help" }),
  ]
  const { report } = runCalibrationHarness({ entries })
  const hygiene = report.perNeed.find((row) => row.need === "hygiene")!
  // Day 2 flips to needs-help with two "met" answers behind it, and day 4
  // flips with only one unmet in the last three. Neither fires a cue.
  assert.equal(hygiene.missedCues, 2)
  assert.equal(hygiene.missRate, 2 / 5)
})

test("paused days emit no cues and leave every denominator", () => {
  const entries: CalibrationEntry[] = [
    entry(0, { food: "needs-help" }),
    entry(1, { food: "needs-help" }),
    entry(2, { food: "needs-help" }, { paused: true }),
    entry(3, { food: "met" }),
  ]
  const { records, report } = runCalibrationHarness({ entries })
  const paused = records.find((record) => record.date === day(2))!
  assert.equal(paused.paused, true)
  assert.equal(paused.cues.length, 0)
  assert.equal(report.pausedDays, 1)
  const food = report.perNeed.find((row) => row.need === "food")!
  assert.equal(food.answeredDays, 3)
  assert.equal(food.cuedDays, 1)
})

test("deleted dates are stripped before replay and honored in the report", () => {
  const deletedDates = new Set([day(1)])
  const { records, report } = runCalibrationHarness({ entries: falseAlarmFixture(), deletedDates })
  assert.equal(records.some((record) => record.date === day(1)), false)
  assert.equal(report.deletionRequested, 1)
  assert.equal(report.deletionHonored, true)
  assert.equal(report.replayedDays, 4)
})

test("drift is flagged when halves disagree beyond threshold", () => {
  const statuses = [
    "needs-help", "needs-help", "met", "met", "met", "met",
    "needs-help", "needs-help", "needs-help", "needs-help", "needs-help", "needs-help",
  ] as const
  const entries = statuses.map((status, i) => entry(i, { food: status }))
  const { report } = runCalibrationHarness({ entries })
  assert.equal(report.drift.firstHalf.days, 6)
  assert.equal(report.drift.secondHalf.days, 6)
  assert.equal(report.drift.falseAlarmRateDelta !== null, true)
  assert.ok((report.drift.falseAlarmRateDelta ?? 0) > 0.25)
  assert.equal(report.drift.driftDetected, true)
})

test("no drift flagged when cue behavior is stable", () => {
  const entries = Array.from({ length: 8 }, (_, i) => entry(i, { food: "met" }))
  const { report } = runCalibrationHarness({ entries })
  assert.equal(report.drift.driftDetected, false)
})

test("subgroup disparity flagged from caller-supplied tags only", () => {
  const statuses: Array<["a" | "b", "met" | "needs-help"]> = [
    ["a", "needs-help"], ["a", "needs-help"], ["a", "needs-help"], ["a", "met"], ["a", "met"],
    ["b", "needs-help"], ["b", "needs-help"], ["b", "needs-help"], ["b", "needs-help"], ["b", "needs-help"],
  ]
  const entries = statuses.map(([subgroup, status], i) => entry(i, { food: status }, { subgroup }))
  const { report } = runCalibrationHarness({ entries, minCells: 1 })
  const a = report.subgroups.find((row) => row.name === "a")!
  const b = report.subgroups.find((row) => row.name === "b")!
  assert.equal(a.falseAlarmRate, 0.667)
  assert.equal(b.falseAlarmRate, 0)
  assert.ok((report.maxSubgroupFalseAlarmDelta ?? 0) > 0.3)
  assert.equal(report.subgroupDisparityFlag, true)
})

test("single subgroup cannot produce a disparity flag", () => {
  const entries = falseAlarmFixture().map((item) => ({ ...item, subgroup: "x" }))
  const { report } = runCalibrationHarness({ entries, minCells: 1 })
  assert.equal(report.maxSubgroupFalseAlarmDelta, null)
  assert.equal(report.subgroupDisparityFlag, false)
})

test("privacy lint flags coordinates, dates, times, phones, postal codes", () => {
  const findings = lintCuePrivacy([
    {
      id: "leak",
      need: "food",
      horizon: "today",
      title: "near 40.7128, -74.0060",
      detail: "call 555-123-4567 on 2026-09-01 at 14:30 zip 10001",
    },
  ])
  const rules = findings.map((finding) => finding.rule).sort()
  assert.deepEqual(rules, ["clock-time", "coordinates", "iso-date", "phone", "postal-code"])
})

test("real learner cue text passes the privacy lint", () => {
  const { report } = runCalibrationHarness({ entries: falseAlarmFixture() })
  assert.equal(report.privacyPassed, true)
  assert.deepEqual(report.privacyViolations, [])
})

test("harness never mutates its input", () => {
  const entries = falseAlarmFixture()
  const snapshot = JSON.parse(JSON.stringify(entries))
  runCalibrationHarness({ entries, deletedDates: new Set([day(0)]) })
  assert.deepEqual(entries, snapshot)
})

test("summarize works on replay records passed explicitly", () => {
  const records = replayCalibration({ entries: falseAlarmFixture() })
  const report = summarizeCalibration(records)
  assert.equal(report.replayedDays, 5)
  assert.equal(report.deletionHonored, true)
})
