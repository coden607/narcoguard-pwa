export type BinauralPreset = {
  id: "alpha" | "theta" | "delta"
  label: string
  beatHz: number
  carrierHz: number
  description: string
}

export type SoundscapePreset = {
  id: "brown" | "ocean" | "deep-drone"
  label: string
  description: string
}

export const BINAURAL_PRESETS: readonly BinauralPreset[] = [
  {
    id: "alpha",
    label: "Calm focus",
    beatHz: 10,
    carrierHz: 180,
    description: "A gentle 10 Hz stereo difference for quiet focus or relaxation.",
  },
  {
    id: "theta",
    label: "Deep meditation",
    beatHz: 6,
    carrierHz: 174,
    description: "A slower 6 Hz stereo difference for a more spacious meditation session.",
  },
  {
    id: "delta",
    label: "Very slow unwind",
    beatHz: 2,
    carrierHz: 160,
    description: "A very slow 2 Hz stereo difference intended for quiet wind-down time.",
  },
] as const

export const SOUNDSCAPE_PRESETS: readonly SoundscapePreset[] = [
  {
    id: "brown",
    label: "Deep brown noise",
    description: "Low, soft noise with much of the high-frequency edge removed.",
  },
  {
    id: "ocean",
    label: "Slow ocean",
    description: "Filtered noise with a gentle repeating swell.",
  },
  {
    id: "deep-drone",
    label: "Deep meditation drone",
    description: "A low harmonic drone built from softly layered tones.",
  },
] as const

export function binauralFrequencies(preset: BinauralPreset) {
  return {
    leftHz: preset.carrierHz,
    rightHz: preset.carrierHz + preset.beatHz,
  }
}

export function clampWellnessVolume(value: number) {
  if (!Number.isFinite(value)) return 0.18
  return Math.min(0.45, Math.max(0, value))
}

export function sessionSeconds(minutes: number) {
  if (!Number.isFinite(minutes)) return 600
  return Math.round(Math.min(60, Math.max(1, minutes)) * 60)
}
