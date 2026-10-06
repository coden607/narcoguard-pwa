import { strict as assert } from "node:assert"
import { test } from "node:test"
import { NEEDS } from "../lib/guardian-stability"
import { kindsForNeeds, levelsForKinds, NEED_TO_KINDS } from "../lib/maslow-needs"
import { NEED_LEVELS, RESOURCE_KINDS } from "../lib/resource-finder"

test("every guardian need maps to at least one searchable kind", () => {
  for (const need of NEEDS) assert.ok(NEED_TO_KINDS[need].length > 0)
  assert.deepEqual(kindsForNeeds(["food", "treatment"]), ["food", "treatment", "pharmacy", "clinic"])
})

test("Maslow levels cover every resource kind once", () => {
  const levelled = NEED_LEVELS.flatMap((level) => [...level.kinds])
  assert.deepEqual([...levelled].sort(), [...RESOURCE_KINDS].sort())
  assert.equal(NEED_LEVELS.map((level) => level.id).join(","), "physiological,safety,belonging,esteem,self-actualization")
})

test("unmet needs only surface their Maslow levels", () => {
  const levels = levelsForKinds(kindsForNeeds(["food", "connection"]))
  assert.deepEqual(levels.map((level) => level.id), ["physiological", "belonging"])
  assert.deepEqual(levels[0].kinds, ["food"])
})
