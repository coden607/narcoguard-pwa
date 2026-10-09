import assert from "node:assert/strict"
import test from "node:test"
import { breathsPerMinute, estimatePulse, fingerCovers, type FrameSample } from "../lib/camera-pulse"

/** A fingertip PPG-like signal: red dips once per beat, plus slow drift and noise (seeded). */
function synth(bpm: number, { seconds = 20, fps = 30, noise = 0.6, red = 190, green = 60, jitter = 0 } = {}): FrameSample[] {
  let seed = 7
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31) - 0.5
  const samples: FrameSample[] = []
  let phase = 0
  for (let i = 0; i < seconds * fps; i++) {
    const t = (i * 1000) / fps
    phase += ((bpm * (1 + jitter * rand())) / 60) * (2 * Math.PI) / fps
    const beat = Math.pow(Math.max(0, Math.sin(phase)), 3)
    samples.push({ t, red: red - 3 * beat + 0.002 * t / 10 + noise * rand(), green })
  }
  return samples
}

for (const bpm of [48, 62, 75, 98, 130, 165]) {
  test(`estimates ${bpm} bpm within 4 bpm`, () => {
    const result = estimatePulse(synth(bpm))
    assert.ok(result.ok, JSON.stringify(result))
    if (result.ok) assert.ok(Math.abs(result.bpm - bpm) <= 4, `got ${result.bpm}`)
  })
}

test("tolerates normal beat-to-beat variation and 15 fps cameras", () => {
  const result = estimatePulse(synth(72, { jitter: 0.08, fps: 15 }))
  assert.ok(result.ok && Math.abs(result.bpm - 72) <= 5, JSON.stringify(result))
})

test("refuses to guess without a fingertip, with too little data or with pure noise", () => {
  assert.deepEqual(estimatePulse(synth(70, { red: 90, green: 85 })), { ok: false, reason: "no-finger" })
  assert.deepEqual(estimatePulse(synth(70, { seconds: 5 })), { ok: false, reason: "too-short" })
  const noisy = estimatePulse(synth(70, { noise: 40 }))
  assert.ok(!noisy.ok || Math.abs(noisy.bpm - 70) <= 5, "noise must fail or still be near the truth")
})

test("finger coverage and breath math", () => {
  assert.equal(fingerCovers({ red: 200, green: 50 }), true)
  assert.equal(fingerCovers({ red: 140, green: 130 }), false)
  assert.equal(breathsPerMinute(7, 30), 14)
  assert.equal(breathsPerMinute(0, 30), 0)
  assert.throws(() => breathsPerMinute(3, 0))
})

test("the founding credit names Shannon Pillion Robinson as CFO and never claims delivery exists", async () => {
  const { ORIGIN_CREDIT, IDEA_ORIGINATOR } = await import("../lib/credits")
  assert.equal(IDEA_ORIGINATOR.name, "Shannon Pillion Robinson")
  assert.equal(IDEA_ORIGINATOR.role, "CFO")
  assert.match(ORIGIN_CREDIT, /no device delivers naloxone yet/)
})
