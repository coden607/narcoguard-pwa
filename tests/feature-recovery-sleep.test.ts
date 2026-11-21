import { strict as assert } from "node:assert"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import {
  CALM_ONLY_MAX_VOLUME,
  PULSE_SCHEDULE,
  SLEEP_MAX_VOLUME,
  addSleepLogEntry,
  clampSleepVolume,
  detectRiskFlags,
  estimateSleepOnset,
  evaluateSleepGate,
  parseSleepLog,
  pulsePhase,
  rateSleepLogEntry,
  sleepTimerSeconds,
  summarizeSleepLog,
  type RiskFlag,
  type SleepLogEntry,
} from "../lib/recovery-sleep"

const NOW = 1_800_000_000_000
const MIN = 60_000
const calmCheck = { isAbnormal: false, severity: "none", recommendedAction: "monitor" } as const
const ALL_FLAGS: RiskFlag[] = ["overdose-alert", "respiratory", "low-spo2", "low-heart-rate", "low-motion", "external-alert", "wake-alarm"]

test("gate: nothing plays unless opted in and the check-in is answered", () => {
  assert.equal(evaluateSleepGate({ optedIn: false, recentUse: "no", requestedMode: "calm", riskFlags: [] }).allowed, false)
  assert.equal(evaluateSleepGate({ optedIn: true, recentUse: null, requestedMode: "calm", riskFlags: [] }).allowed, false)
  const ok = evaluateSleepGate({ optedIn: true, recentUse: "no", requestedMode: "calm", riskFlags: [] })
  assert.equal(ok.allowed, true)
  assert.equal(ok.mode, "calm")
})

test("gate: every risk flag blocks all audio, including after recent use and in pulse mode", () => {
  for (const flag of ALL_FLAGS) {
    for (const recentUse of ["yes", "no"] as const) {
      for (const requestedMode of ["calm", "pulses"] as const) {
        const decision = evaluateSleepGate({ optedIn: true, recentUse, requestedMode, riskFlags: [flag] })
        assert.equal(decision.allowed, false, `${flag} ${recentUse} ${requestedMode}`)
        assert.equal(decision.maxVolume, 0)
        assert.equal(decision.mode, null)
      }
    }
  }
})

test("gate: recent use never allows timed pulses and lowers the volume cap", () => {
  const decision = evaluateSleepGate({ optedIn: true, recentUse: "yes", requestedMode: "pulses", riskFlags: [] })
  assert.equal(decision.allowed, true)
  assert.equal(decision.mode, "calm")
  assert.equal(decision.maxVolume, CALM_ONLY_MAX_VOLUME)
  assert.ok(CALM_ONLY_MAX_VOLUME < SLEEP_MAX_VOLUME)
})

test("gate: pulses only when no recent use and no risk signals", () => {
  const decision = evaluateSleepGate({ optedIn: true, recentUse: "no", requestedMode: "pulses", riskFlags: [] })
  assert.equal(decision.mode, "pulses")
  assert.equal(decision.maxVolume, SLEEP_MAX_VOLUME)
})

test("risk flags: vitals service alerts and low readings are detected", () => {
  assert.deepEqual(detectRiskFlags({ now: NOW, overdoseCheck: calmCheck, respiratoryRate: 14 }), [])
  assert.deepEqual(detectRiskFlags({ now: NOW, overdoseCheck: { ...calmCheck, isAbnormal: true } }), ["overdose-alert"])
  assert.deepEqual(detectRiskFlags({ now: NOW, overdoseCheck: { ...calmCheck, severity: "low" } }), ["overdose-alert"])
  assert.deepEqual(detectRiskFlags({ now: NOW, overdoseCheck: { ...calmCheck, recommendedAction: "increase_observation" } }), ["overdose-alert"])
  assert.deepEqual(detectRiskFlags({ now: NOW, respiratoryRate: 8 }), ["respiratory"])
  assert.deepEqual(detectRiskFlags({ now: NOW, spO2: 89, spO2At: NOW - 2000 }), ["low-spo2"])
  assert.deepEqual(detectRiskFlags({ now: NOW, spO2: 97, spO2At: NOW - 2000 }), [])
  assert.deepEqual(detectRiskFlags({ now: NOW, heartRate: 35, heartRateAt: NOW - 1000 }), ["low-heart-rate"])
  assert.deepEqual(detectRiskFlags({ now: NOW, lowMotionAlert: true }), ["low-motion"])
  assert.deepEqual(detectRiskFlags({ now: NOW, externalAlert: true }), ["external-alert"])
  assert.deepEqual(detectRiskFlags({ now: NOW, wakeAlarm: true }), ["wake-alarm"])
})

test("risk flags: old Bluetooth readings are not treated as current", () => {
  assert.deepEqual(detectRiskFlags({ now: NOW, spO2: 85, spO2At: NOW - 60_000, heartRate: 30, heartRateAt: NOW - 60_000 }), [])
})

test("audio stops: a risk appearing mid-session turns an allowed gate into a stop", () => {
  const before = evaluateSleepGate({ optedIn: true, recentUse: "no", requestedMode: "pulses", riskFlags: detectRiskFlags({ now: NOW, spO2: 96, spO2At: NOW }) })
  const after = evaluateSleepGate({ optedIn: true, recentUse: "no", requestedMode: "pulses", riskFlags: detectRiskFlags({ now: NOW + 1000, spO2: 88, spO2At: NOW + 1000 }) })
  assert.equal(before.allowed, true)
  assert.equal(after.allowed, false)
  assert.match(after.reason, /Blood oxygen is low/)
})

test("volume and timer are bounded", () => {
  assert.equal(clampSleepVolume(1, SLEEP_MAX_VOLUME), SLEEP_MAX_VOLUME)
  assert.equal(clampSleepVolume(0.25, CALM_ONLY_MAX_VOLUME), CALM_ONLY_MAX_VOLUME)
  assert.equal(clampSleepVolume(-1, SLEEP_MAX_VOLUME), 0)
  assert.equal(clampSleepVolume(Number.NaN, CALM_ONLY_MAX_VOLUME), 0.1)
  assert.equal(sleepTimerSeconds(1), 300)
  assert.equal(sleepTimerSeconds(1000), 480 * 60)
})

test("pulse schedule waits for onset, runs in blocks, pauses on arousal and ends", () => {
  const start = NOW
  assert.equal(estimateSleepOnset(start, [], start + 10 * MIN), null)
  assert.equal(estimateSleepOnset(start, [], start + 31 * MIN), start + PULSE_SCHEDULE.defaultOnsetMinutes * MIN)
  assert.equal(pulsePhase({ now: start + 5 * MIN, startedAt: start, samples: [] }).phase, "waiting")
  const onset = start + 30 * MIN
  assert.equal(pulsePhase({ now: onset, startedAt: start, samples: [] }).phase, "on")
  assert.equal(pulsePhase({ now: onset + 5 * PULSE_SCHEDULE.pulseIntervalMs + 100, startedAt: start, samples: [] }).phase, "off")
  assert.equal(pulsePhase({ now: onset + 181 * MIN, startedAt: start, samples: [] }).phase, "done")

  // Heart rate settles from ~70 to ~62 at 20 minutes: onset is estimated from it.
  const samples = Array.from({ length: 40 }, (_, i) => ({ at: start + i * MIN, bpm: i < 18 ? 70 : 62 }))
  const hrOnset = estimateSleepOnset(start, samples, start + 39 * MIN)
  assert.ok(hrOnset !== null && hrOnset >= start + 15 * MIN && hrOnset < start + 30 * MIN)
  const stirred = [...samples, { at: start + 40 * MIN, bpm: 80 }]
  assert.equal(pulsePhase({ now: start + 41 * MIN, startedAt: start, samples: stirred }).phase, "paused")
})

test("sleep log is local, validated and summarizes only real entries", () => {
  assert.deepEqual(parseSleepLog(null), [])
  assert.deepEqual(parseSleepLog("not json"), [])
  assert.equal(summarizeSleepLog([]), null)
  const entry: SleepLogEntry = { id: "a", startedAt: NOW, endedAt: NOW + 30 * MIN, mode: "calm", endedBy: "timer" }
  const log = addSleepLogEntry([], entry)
  assert.equal(log.length, 1)
  assert.deepEqual(parseSleepLog(JSON.stringify([...log, { id: "bad", startedAt: 5, endedAt: 1, mode: "calm", endedBy: "timer" }])), log)
  const rated = rateSleepLogEntry(log, "a", 4)
  assert.deepEqual(summarizeSleepLog(rated), { sessions: 1, averageMinutes: 30, rated: 1, averageRating: 4 })
})

test("Recovery Sleep page keeps its disclaimer, check-in and privacy text, and is linked", async () => {
  const page = await readFile(new URL("../app/recovery-sleep/page.tsx", import.meta.url), "utf8")
  assert.match(page, /not a medical device/)
  assert.match(page, /does not diagnose or treat insomnia/)
  assert.match(page, /does not prevent or reverse an overdose/)
  assert.match(page, /Have you used opioids or sedatives/)
  assert.match(page, /never pauses or changes overdose monitoring/)
  assert.match(page, /experimental/)
  assert.match(page, /cannot measure brain waves/)
  assert.match(page, /never uploaded/)
  assert.doesNotMatch(page, /\.(mp3|wav|ogg|m4a)\b/i)
  const dashboard = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8")
  assert.match(dashboard, /href="\/recovery-sleep"/)
  for (const file of ["../app/recovery-sleep/page.tsx", "../lib/recovery-sleep.ts", "../docs/NG-RECOVERY-SLEEP.md"]) {
    const text = await readFile(new URL(file, import.meta.url), "utf8")
    assert.doesNotMatch(text, /hark/i, file)
    assert.doesNotMatch(text, /\bcures?\b|treats insomnia|prevents overdose/i, file)
  }
})
