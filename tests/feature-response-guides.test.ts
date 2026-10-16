import { strict as assert } from "node:assert"
import { test } from "node:test"
import { GUIDES, LESSONS, METRONOME_BPM, SECOND_DOSE_SECONDS, beatIntervalMs, formatClock, parseProgress } from "../lib/response-guides"

test("both guides start with responsiveness or 911 and include their tools", () => {
  assert.match(GUIDES.naloxone.steps[1].title, /911/)
  assert.match(GUIDES.cpr.steps[0].title, /911/)
  assert.ok(GUIDES.naloxone.steps.some((step) => step.tool === "second-dose-timer"))
  assert.ok(GUIDES.cpr.steps.some((step) => step.tool === "metronome"))
  assert.equal(SECOND_DOSE_SECONDS, 180, "second dose after 2–3 minutes")
})

test("the metronome stays within the AHA 100–120 per minute range", () => {
  assert.ok(METRONOME_BPM >= 100 && METRONOME_BPM <= 120)
  assert.equal(beatIntervalMs(METRONOME_BPM), 545)
  assert.throws(() => beatIntervalMs(80))
  assert.throws(() => beatIntervalMs(140))
  assert.throws(() => beatIntervalMs(Number.NaN))
})

test("clock formatting and lesson progress parsing are defensive", () => {
  assert.equal(formatClock(180), "3:00")
  assert.equal(formatClock(65.9), "1:05")
  assert.equal(formatClock(-4), "0:00")
  assert.deepEqual(parseProgress(JSON.stringify(["recognize", "made-up", 3])), ["recognize"])
  assert.deepEqual(parseProgress("not json"), [])
  assert.deepEqual(parseProgress(null), [])
})

test("every lesson has a valid practice check", () => {
  assert.equal(new Set(LESSONS.map((lesson) => lesson.id)).size, LESSONS.length)
  for (const lesson of LESSONS) {
    assert.ok(lesson.points.length >= 3, lesson.id)
    assert.ok(lesson.check.answer >= 0 && lesson.check.answer < lesson.check.options.length, lesson.id)
    assert.ok(lesson.check.why.length > 10, lesson.id)
  }
})
