// Recovery Sleep: opt-in wind-down audio for people in recovery, with a safety gate that always
// puts overdose safety ahead of sleep. Pure functions only, so every rule here is unit-tested
// (tests/feature-recovery-sleep.test.ts) and the page cannot drift from it.
//
// Why the gate exists: deeper sleep can mean a higher arousal threshold, and arousal from sleep
// is one of the things that restores breathing during opioid-induced respiratory depression.
// So "timed pulses" (the experimental slow-wave mode) never run after recent use or while any
// risk signal is present, and every risk signal or alert stops all audio at once.

/** Preference key. Only the opt-in choice and the local sleep log are ever stored. */
export const RECOVERY_SLEEP_OPT_IN_KEY = "narcoguard_recovery_sleep_opt_in_v1"
export const RECOVERY_SLEEP_LOG_KEY = "narcoguard_recovery_sleep_log_v1"

/** Highest master volume for normal sessions (0-1 Web Audio gain). */
export const SLEEP_MAX_VOLUME = 0.3
/** Lower cap used when the person says they used opioids or sedatives in the last 24 hours. */
export const CALM_ONLY_MAX_VOLUME = 0.12
export const DEFAULT_SLEEP_VOLUME = 0.1

/** Risk thresholds. Any one of these stops all Recovery Sleep audio immediately. */
export const RISK_THRESHOLDS = {
  /** A current blood-oxygen reading below this is a risk signal. */
  minSpO2: 92,
  /** A current heart-rate reading below this is a risk signal. */
  minHeartRate: 40,
  /** A current respiratory-rate reading below this is a risk signal. */
  minRespiratoryRate: 10,
} as const

/** A reading older than this is not treated as current (matches lib/ble-vitals STALE_AFTER_MS). */
export const READING_FRESH_MS = 10_000

export type RecentUseAnswer = "yes" | "no"

export type RiskFlag =
  | "overdose-alert"
  | "respiratory"
  | "low-spo2"
  | "low-heart-rate"
  | "low-motion"
  | "external-alert"
  | "wake-alarm"

export const RISK_FLAG_LABELS: Record<RiskFlag, string> = {
  "overdose-alert": "An overdose-risk alert is active",
  respiratory: "Breathing rate is low",
  "low-spo2": "Blood oxygen is low",
  "low-heart-rate": "Heart rate is very low",
  "low-motion": "The watch reports a low-motion alert",
  "external-alert": "A NarcoGuard alert is active",
  "wake-alarm": "Your wake-up alarm is sounding",
}

export type OverdoseCheckLike = {
  isAbnormal: boolean
  severity: "none" | "low" | "medium" | "high" | "critical"
  recommendedAction: "monitor" | "increase_observation" | "prepare_response" | "activate_emergency"
}

export type RiskInputs = {
  now: number
  /** From the vitals provider, only when it reports live data. */
  overdoseCheck?: OverdoseCheckLike | null
  respiratoryRate?: number | null
  /** Live Bluetooth readings with the time each arrived. */
  spO2?: number
  spO2At?: number
  heartRate?: number
  heartRateAt?: number
  /** Set by a watch low-motion alert when one is available. */
  lowMotionAlert?: boolean
  /** Any other NarcoGuard alert (SOS, check-on-me timer, emergency flow). */
  externalAlert?: boolean
  /** The wake-up alarm is sounding. */
  wakeAlarm?: boolean
}

const fresh = (at: number | undefined, now: number) => at !== undefined && now - at <= READING_FRESH_MS
const finite = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value)

/** Every active risk signal. An empty list is the only state in which sleep audio may play. */
export function detectRiskFlags(input: RiskInputs): RiskFlag[] {
  const flags: RiskFlag[] = []
  const check = input.overdoseCheck
  if (check && (check.isAbnormal || check.severity !== "none" || check.recommendedAction !== "monitor")) flags.push("overdose-alert")
  if (finite(input.respiratoryRate) && input.respiratoryRate < RISK_THRESHOLDS.minRespiratoryRate) flags.push("respiratory")
  if (finite(input.spO2) && fresh(input.spO2At, input.now) && input.spO2 < RISK_THRESHOLDS.minSpO2) flags.push("low-spo2")
  if (finite(input.heartRate) && fresh(input.heartRateAt, input.now) && input.heartRate < RISK_THRESHOLDS.minHeartRate) flags.push("low-heart-rate")
  if (input.lowMotionAlert) flags.push("low-motion")
  if (input.externalAlert) flags.push("external-alert")
  if (input.wakeAlarm) flags.push("wake-alarm")
  return flags
}

export type SleepMode = "calm" | "pulses"

export type GateInput = {
  optedIn: boolean
  /** The pre-start check-in answer for this session. Never stored. */
  recentUse: RecentUseAnswer | null
  /** The mode the person picked. */
  requestedMode: SleepMode
  riskFlags: readonly RiskFlag[]
}

export type GateDecision =
  | { allowed: false; mode: null; maxVolume: 0; reason: string }
  | { allowed: true; mode: SleepMode; maxVolume: number; reason: string }

/**
 * The single rule set for whether Recovery Sleep audio may play, and in which mode.
 * Order matters: opt-in, then check-in, then risk signals (which always win), then recent use.
 */
export function evaluateSleepGate(input: GateInput): GateDecision {
  if (!input.optedIn) return { allowed: false, mode: null, maxVolume: 0, reason: "Recovery Sleep is off. Turn it on to use it." }
  if (input.recentUse === null) return { allowed: false, mode: null, maxVolume: 0, reason: "Answer the check-in before starting." }
  if (input.riskFlags.length > 0) {
    return { allowed: false, mode: null, maxVolume: 0, reason: `Audio stopped: ${input.riskFlags.map((flag) => RISK_FLAG_LABELS[flag]).join("; ")}.` }
  }
  if (input.recentUse === "yes") {
    return { allowed: true, mode: "calm", maxVolume: CALM_ONLY_MAX_VOLUME, reason: "Plain calming sound only, at a lower volume cap, because of recent opioid or sedative use." }
  }
  return input.requestedMode === "pulses"
    ? { allowed: true, mode: "pulses", maxVolume: SLEEP_MAX_VOLUME, reason: "Experimental timed pulses are allowed for this session." }
    : { allowed: true, mode: "calm", maxVolume: SLEEP_MAX_VOLUME, reason: "Plain calming sound." }
}

export function clampSleepVolume(value: number, maxVolume: number): number {
  if (!Number.isFinite(value)) return Math.min(DEFAULT_SLEEP_VOLUME, maxVolume)
  return Math.min(Math.max(0, maxVolume), Math.max(0, value))
}

export function sleepTimerSeconds(minutes: number): number {
  if (!Number.isFinite(minutes)) return 45 * 60
  return Math.round(Math.min(480, Math.max(5, minutes)) * 60)
}

// ---- Experimental timed pulses -------------------------------------------------------------
// Lab studies time 50 ms pink-noise pulses to the up-state of slow waves detected by EEG
// (Ngo et al. 2013) and deliver them in blocks of five followed by a pause of similar length
// (Papalambros et al. 2017). A phone or watch has no EEG, so this mode is only an approximation:
// it waits for an estimated sleep onset, then plays ~1 Hz pulse blocks during the first hours of
// sleep, when deep sleep is most common, and pauses when heart rate suggests the person stirred.

export const PULSE_SCHEDULE = {
  /** Default wait before the first pulse block when no heart-rate data is available. */
  defaultOnsetMinutes: 30,
  /** Never pulse before this, even if heart rate drops sooner. */
  minOnsetMinutes: 15,
  /** Pulses run for this long after estimated sleep onset, then stop for the night. */
  windowMinutes: 180,
  pulsesPerBlock: 5,
  /** Spacing between pulses, close to one slow-oscillation period. */
  pulseIntervalMs: 1075,
  pulseLengthMs: 50,
  /** Silence after each block (about the length of a block). */
  offBlockMs: 5 * 1075,
  /** A heart-rate rise this far above the settled level suggests stirring. */
  arousalRiseBpm: 10,
  /** How long pulses pause after a suspected stir. */
  arousalPauseMinutes: 10,
  /** A drop of this much from the first minutes' heart rate counts as settling. */
  onsetDropBpm: 5,
} as const

export type HeartRateSample = { at: number; bpm: number }

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
const MINUTE = 60_000

/**
 * Estimated sleep onset (ms epoch). With heart-rate samples: the first time, at least
 * minOnsetMinutes in, that the 5-minute mean is onsetDropBpm below the first 5 minutes' mean.
 * Without enough samples: startedAt + defaultOnsetMinutes. Returns null if not reached yet.
 */
export function estimateSleepOnset(startedAt: number, samples: readonly HeartRateSample[], now: number): number | null {
  const fallback = startedAt + PULSE_SCHEDULE.defaultOnsetMinutes * MINUTE
  const sorted = samples.filter((sample) => sample.at >= startedAt && sample.at <= now && Number.isFinite(sample.bpm)).sort((a, b) => a.at - b.at)
  const first = sorted.filter((sample) => sample.at < startedAt + 5 * MINUTE).map((sample) => sample.bpm)
  if (first.length >= 3) {
    const startLevel = mean(first)
    const earliest = startedAt + PULSE_SCHEDULE.minOnsetMinutes * MINUTE
    for (const sample of sorted) {
      if (sample.at < earliest) continue
      const window = sorted.filter((item) => item.at > sample.at - 5 * MINUTE && item.at <= sample.at).map((item) => item.bpm)
      if (window.length >= 3 && mean(window) <= startLevel - PULSE_SCHEDULE.onsetDropBpm) return sample.at
    }
  }
  return now >= fallback ? fallback : null
}

export type PulsePhase = "waiting" | "on" | "off" | "paused" | "done"

/** Whether the pulse layer should be in a pulse block right now. Pure; the page ticks it. */
export function pulsePhase(params: {
  now: number
  startedAt: number
  samples: readonly HeartRateSample[]
}): { phase: PulsePhase; onsetAt: number | null } {
  const { now, startedAt, samples } = params
  const onsetAt = estimateSleepOnset(startedAt, samples, now)
  if (onsetAt === null || now < onsetAt) return { phase: "waiting", onsetAt }
  if (now >= onsetAt + PULSE_SCHEDULE.windowMinutes * MINUTE) return { phase: "done", onsetAt }

  const settled = samples.filter((sample) => sample.at > onsetAt - 5 * MINUTE && sample.at <= onsetAt).map((sample) => sample.bpm)
  if (settled.length >= 3) {
    const level = mean(settled)
    const recentRise = samples.some((sample) =>
      sample.at > now - PULSE_SCHEDULE.arousalPauseMinutes * MINUTE && sample.at <= now && sample.bpm >= level + PULSE_SCHEDULE.arousalRiseBpm)
    if (recentRise) return { phase: "paused", onsetAt }
  }

  const blockMs = PULSE_SCHEDULE.pulsesPerBlock * PULSE_SCHEDULE.pulseIntervalMs
  const cycle = blockMs + PULSE_SCHEDULE.offBlockMs
  return { phase: (now - onsetAt) % cycle < blockMs ? "on" : "off", onsetAt }
}

// ---- Local-only sleep log ------------------------------------------------------------------

export type SleepRating = 1 | 2 | 3 | 4 | 5

export type SleepLogEntry = {
  id: string
  startedAt: number
  endedAt: number
  mode: SleepMode
  /** Why the session ended. */
  endedBy: "timer" | "stopped" | "safety" | "alarm"
  /** Optional morning rating the person adds themselves. */
  rating?: SleepRating
}

const MODES: readonly SleepMode[] = ["calm", "pulses"]
const ENDINGS: readonly SleepLogEntry["endedBy"][] = ["timer", "stopped", "safety", "alarm"]

function isEntry(value: unknown): value is SleepLogEntry {
  if (!value || typeof value !== "object") return false
  const entry = value as Record<string, unknown>
  return typeof entry.id === "string"
    && typeof entry.startedAt === "number" && Number.isFinite(entry.startedAt)
    && typeof entry.endedAt === "number" && Number.isFinite(entry.endedAt)
    && entry.endedAt >= entry.startedAt
    && MODES.includes(entry.mode as SleepMode)
    && ENDINGS.includes(entry.endedBy as SleepLogEntry["endedBy"])
    && (entry.rating === undefined || [1, 2, 3, 4, 5].includes(entry.rating as number))
}

/** Parses stored log JSON, dropping anything malformed. Newest first, at most 60 entries. */
export function parseSleepLog(raw: string | null): SleepLogEntry[] {
  if (!raw) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isEntry).sort((a, b) => b.startedAt - a.startedAt).slice(0, 60)
  } catch {
    return []
  }
}

export function addSleepLogEntry(log: readonly SleepLogEntry[], entry: SleepLogEntry): SleepLogEntry[] {
  return parseSleepLog(JSON.stringify([entry, ...log.filter((item) => item.id !== entry.id)]))
}

export function rateSleepLogEntry(log: readonly SleepLogEntry[], id: string, rating: SleepRating): SleepLogEntry[] {
  return log.map((entry) => (entry.id === id ? { ...entry, rating } : entry))
}

export function sessionMinutes(entry: Pick<SleepLogEntry, "startedAt" | "endedAt">): number {
  return Math.max(0, Math.round((entry.endedAt - entry.startedAt) / MINUTE))
}

/** Summary of real logged sessions only. Returns null when there is nothing logged. */
export function summarizeSleepLog(log: readonly SleepLogEntry[]): { sessions: number; averageMinutes: number; rated: number; averageRating: number | null } | null {
  if (log.length === 0) return null
  const ratings = log.flatMap((entry) => (entry.rating ? [entry.rating] : []))
  return {
    sessions: log.length,
    averageMinutes: Math.round(mean(log.map(sessionMinutes))),
    rated: ratings.length,
    averageRating: ratings.length ? Math.round(mean(ratings) * 10) / 10 : null,
  }
}
