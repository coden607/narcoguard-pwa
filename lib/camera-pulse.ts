// Fingertip pulse estimate from the phone camera (photoplethysmography): with a fingertip over the
// lens and the flash on, the red channel brightens and dims with each heartbeat. Everything runs on
// the device and nothing is stored. This is an estimate for the person's own information, not a
// medical measurement, and it is never used to detect overdoses or alert anyone.

export interface FrameSample {
  /** Milliseconds since the start of the measurement. */
  t: number
  /** Mean red and green channel values of the frame, 0–255. */
  red: number
  green: number
}

export const MEASURE_SECONDS = 20
export const PLAUSIBLE_BPM = [40, 180] as const

/** A fingertip lit by the flash fills the frame with bright red and little green. */
export function fingerCovers(sample: Pick<FrameSample, "red" | "green">): boolean {
  return sample.red > 120 && sample.red > sample.green * 1.6
}

/** Subtracts a centered moving average so slow brightness drift does not look like beats. */
export function detrend(values: number[], window: number): number[] {
  const half = Math.max(1, Math.floor(window / 2))
  return values.map((value, i) => {
    const from = Math.max(0, i - half)
    const to = Math.min(values.length, i + half + 1)
    let sum = 0
    for (let j = from; j < to; j++) sum += values[j]
    return value - sum / (to - from)
  })
}

export type PulseEstimate =
  | { ok: true; bpm: number; beats: number }
  | { ok: false; reason: "too-short" | "no-finger" | "irregular" | "out-of-range" }

/**
 * Estimates beats per minute from red-channel samples: detrend, light smoothing, peaks at least
 * 1/3 s apart (180 bpm), then the median beat-to-beat interval. Returns a reason instead of a number
 * whenever the signal is too short, uncovered or too irregular to trust.
 */
export function estimatePulse(samples: FrameSample[]): PulseEstimate {
  if (samples.length < 2 || samples[samples.length - 1].t - samples[0].t < 8_000) return { ok: false, reason: "too-short" }
  const covered = samples.filter(fingerCovers).length / samples.length
  if (covered < 0.8) return { ok: false, reason: "no-finger" }

  const durationS = (samples[samples.length - 1].t - samples[0].t) / 1000
  const fps = (samples.length - 1) / durationS
  const detrended = detrend(samples.map((s) => s.red), Math.round(fps * 1.5))
  const smoothed = detrended.map((_, i) => {
    const a = detrended[Math.max(0, i - 1)], b = detrended[i], c = detrended[Math.min(detrended.length - 1, i + 1)]
    return (a + b + c) / 3
  })

  // Blood volume rises with each beat, which darkens the red channel, so beats are the troughs.
  const signal = smoothed.map((v) => -v)
  const minGapMs = 60_000 / PLAUSIBLE_BPM[1]
  const sorted = [...signal].sort((x, y) => x - y)
  const threshold = sorted[Math.floor(sorted.length * 0.6)]
  const peaks: number[] = []
  for (let i = 1; i < signal.length - 1; i++) {
    if (signal[i] <= threshold || signal[i] < signal[i - 1] || signal[i] < signal[i + 1]) continue
    const t = samples[i].t
    const last = peaks[peaks.length - 1]
    if (last !== undefined && t - samples[last].t < minGapMs) {
      if (signal[i] > signal[last]) peaks[peaks.length - 1] = i
      continue
    }
    peaks.push(i)
  }
  if (peaks.length < 6) return { ok: false, reason: "irregular" }

  const intervals = peaks.slice(1).map((p, k) => samples[p].t - samples[peaks[k]].t)
  const median = [...intervals].sort((x, y) => x - y)[Math.floor(intervals.length / 2)]
  const consistent = intervals.filter((ms) => Math.abs(ms - median) <= median * 0.25).length / intervals.length
  if (consistent < 0.7) return { ok: false, reason: "irregular" }

  const bpm = Math.round(60_000 / median)
  if (bpm < PLAUSIBLE_BPM[0] || bpm > PLAUSIBLE_BPM[1]) return { ok: false, reason: "out-of-range" }
  return { ok: true, bpm, beats: peaks.length }
}

export const PULSE_FAILURE_MESSAGE: Record<Exclude<PulseEstimate, { ok: true }>["reason"], string> = {
  "too-short": "The measurement was too short. Try again and hold still for the full time.",
  "no-finger": "The camera could not see a fingertip. Cover the back camera and flash completely with one fingertip, pressing lightly.",
  irregular: "The signal was too uneven to read. Rest your hand on a table, press lightly and hold still, then try again.",
  "out-of-range": "The reading was outside the range this check can measure. Try again, or use a pulse oximeter.",
}

/** Breaths per minute from taps counted over a known number of seconds. */
export function breathsPerMinute(taps: number, seconds: number): number {
  if (!Number.isFinite(taps) || !Number.isFinite(seconds) || seconds <= 0 || taps < 0) throw new RangeError("Invalid breath count")
  return Math.round((taps * 60) / seconds)
}

export const BREATH_COUNT_SECONDS = 30
