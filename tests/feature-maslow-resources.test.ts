import { strict as assert } from "node:assert"
import { test } from "node:test"
import { resourceKindsForNeeds } from "../lib/maslow-resources"

test("resource matching prioritizes physiological needs before higher-level needs", () => {
  assert.deepEqual(resourceKindsForNeeds(["connection", "food", "hygiene"]), ["food", "quick-meal", "toilets", "showers", "community"])
})

test("treatment deficiency exposes treatment and health support without emergency inference", () => {
  const kinds = resourceKindsForNeeds(["treatment"])
  assert.deepEqual(kinds, ["clinic", "pharmacy", "treatment"])
  assert.equal(kinds.includes("emergency"), false)
})
