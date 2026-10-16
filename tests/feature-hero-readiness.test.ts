import { strict as assert } from "node:assert"
import { test } from "node:test"
import { acceptsHeroNaloxoneAttestation } from "../lib/hero-certification"

test("Hero naloxone readiness requires an explicit true attestation", () => {
  assert.equal(acceptsHeroNaloxoneAttestation(true), true)
  for (const value of [false, undefined, null, "true", 1]) assert.equal(acceptsHeroNaloxoneAttestation(value), false)
})
