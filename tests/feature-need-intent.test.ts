import { strict as assert } from "node:assert"
import { test } from "node:test"
import { MASLOW_KIND_ORDER, QUICK_NEEDS, matchNeeds, orderByMaslow, parseKindList } from "../lib/need-intent"
import { RESOURCE_KINDS } from "../lib/resource-finder"

test("plain words map to resource kinds, basic needs first", () => {
  assert.deepEqual(matchNeeds("I need a job and I'm hungry and have nowhere to sleep"), ["food", "shelter", "jobs"])
  assert.deepEqual(matchNeeds("need a shower and to wash my clothes"), ["showers", "laundry"])
  assert.deepEqual(matchNeeds("I want to get into detox"), ["treatment"])
  assert.deepEqual(matchNeeds("my prescription ran out and I feel sick"), ["clinic", "pharmacy"])
  assert.deepEqual(matchNeeds("I feel lonely, I need someone to talk to"), ["community"])
  assert.deepEqual(matchNeeds("where can I charge my phone"), ["library"])
})

test("nothing recognized, empty or junk input returns an empty list", () => {
  assert.deepEqual(matchNeeds(""), [])
  assert.deepEqual(matchNeeds("   "), [])
  assert.deepEqual(matchNeeds("blue sky today"), [])
})

test("matches whole words only, so 'later' does not match 'er'", () => {
  assert.deepEqual(matchNeeds("see you later"), [])
  assert.ok(!matchNeeds("the hammer").includes("emergency"))
})

test("every kind is in the Maslow order exactly once and quick picks only use known kinds", () => {
  assert.deepEqual([...MASLOW_KIND_ORDER].sort(), [...RESOURCE_KINDS].sort())
  for (const pick of QUICK_NEEDS) for (const kind of pick.kinds) assert.ok(RESOURCE_KINDS.includes(kind))
})

test("AI output is validated: unknown kinds and non-strings are dropped and order is fixed", () => {
  assert.deepEqual(parseKindList({ kinds: ["jobs", "food", "rocket", 3, "food"] }), ["food", "jobs"])
  assert.deepEqual(parseKindList(["shelter"]), ["shelter"])
  assert.deepEqual(parseKindList("food"), [])
  assert.deepEqual(parseKindList(null), [])
  assert.deepEqual(orderByMaslow(["library", "water"]), ["water", "library"])
})
