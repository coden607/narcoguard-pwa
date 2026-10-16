import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("resource cards distinguish user verification from directory data", () => {
  const component = readFileSync("components/guardian/maslow-resource-automation.tsx", "utf8")
  assert.match(component, /Record a verification I made/)
  assert.match(component, /I confirmed open \/ answering/)
  assert.match(component, /I confirmed closed/)
  assert.match(component, /Couldn’t confirm/)
  assert.match(component, /expires/)
  assert.match(component, /does not promise a meal, bed, appointment, eligibility, stock, or price/i)
})
