import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("Maslow resource automation remembers and periodically refreshes known resources", () => {
  const component = readFileSync("components/guardian/maslow-resource-automation.tsx", "utf8")
  assert.match(component, /rememberKnownResources/)
  assert.match(component, /15 \* 60_000/)
  assert.match(component, /Known resource inventory/)
  assert.match(component, /Refresh known availability/)
  assert.match(component, /stale — refresh recommended/)
})
