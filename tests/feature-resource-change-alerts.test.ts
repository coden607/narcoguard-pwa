import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("resource cards can opt into local listing-change watches", () => {
  const component = readFileSync("components/guardian/maslow-resource-automation.tsx", "utf8")
  assert.match(component, /Watch listing changes/)
  assert.match(component, /Stop watching changes/)
  assert.match(component, /detectResourceChanges/)
  assert.match(component, /NarcoGuard resource update/)
  assert.match(component, /public-directory results, not confirmed provider availability/)
})

test("resource change notifications never request permission implicitly", () => {
  const component = readFileSync("components/guardian/maslow-resource-automation.tsx", "utf8")
  assert.match(component, /Notification\.permission === "granted"/)
  assert.doesNotMatch(component, /Notification\.requestPermission/)
})
