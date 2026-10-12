import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("resource cards expose bounded upcoming listed-hour windows", () => {
  const component = readFileSync("components/guardian/maslow-resource-automation.tsx", "utf8")
  assert.match(component, /upcomingOpeningWindows/)
  assert.match(component, /Upcoming listed hours/)
  assert.match(component, /not an appointment, reservation, or guarantee/)
})
