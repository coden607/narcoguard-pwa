import { strict as assert } from "node:assert"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import {
  BINAURAL_PRESETS,
  SOUNDSCAPE_PRESETS,
  binauralFrequencies,
  clampWellnessVolume,
  sessionSeconds,
} from "../lib/wellness-audio"

test("binaural presets use distinct stereo frequencies without medical claims", () => {
  assert.deepEqual(BINAURAL_PRESETS.map((preset) => preset.beatHz), [10, 6, 2])
  for (const preset of BINAURAL_PRESETS) {
    const frequencies = binauralFrequencies(preset)
    assert.equal(frequencies.rightHz - frequencies.leftHz, preset.beatHz)
    assert.ok(frequencies.leftHz >= 100 && frequencies.rightHz < 250)
    assert.doesNotMatch(preset.description, /treat|cure|detox|diagnos|brainwave|entrain/i)
  }
})

test("meditation soundscapes include low-noise, ocean and drone options", () => {
  assert.deepEqual(SOUNDSCAPE_PRESETS.map((preset) => preset.id), ["brown", "ocean", "deep-drone"])
})

test("wellness audio volume and timer are bounded", () => {
  assert.equal(clampWellnessVolume(-1), 0)
  assert.equal(clampWellnessVolume(0.18), 0.18)
  assert.equal(clampWellnessVolume(1), 0.45)
  assert.equal(clampWellnessVolume(Number.NaN), 0.18)
  assert.equal(sessionSeconds(0), 60)
  assert.equal(sessionSeconds(15), 900)
  assert.equal(sessionSeconds(90), 3600)
})

test("calm page keeps safety and privacy boundaries visible", async () => {
  const page = await readFile(new URL("../app/calm/page.tsx", import.meta.url), "utf8")
  assert.match(page, /stereo headphones/i)
  assert.match(page, /Do not use this feature while driving/i)
  assert.match(page, /not medical treatment/i)
  assert.match(page, /does not claim that a particular frequency changes brain activity/i)
  assert.match(page, /does not need an account, microphone, location, or network audio stream/i)
})
