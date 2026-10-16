import { strict as assert } from "node:assert"
import { test } from "node:test"
import { cleanMeetingNote, openHeroLocation, sealHeroLocation } from "../lib/hero-location"

test("Hero exact location is encrypted and only opens with the same secret", () => {
  const sealed = sealHeroLocation({ lat: 42.098765, lon: -75.912345 }, "a-secret-long-enough-for-tests")
  assert.ok(sealed)
  assert.ok(!sealed?.includes("42.098765"))
  assert.deepEqual(openHeroLocation(sealed, "a-secret-long-enough-for-tests"), { lat: 42.098765, lon: -75.912345 })
  assert.equal(openHeroLocation(sealed, "wrong-secret"), null)
})

test("invalid locations are rejected and meeting notes are bounded", () => {
  assert.equal(sealHeroLocation({ lat: 100, lon: 1 }, "secret"), null)
  assert.equal(cleanMeetingNote("   Meet   by the library entrance   "), "Meet by the library entrance")
  assert.equal(cleanMeetingNote(""), null)
  assert.equal(cleanMeetingNote("x".repeat(300))?.length, 240)
})
