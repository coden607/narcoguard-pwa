import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("stability planner connects user-entered appointment ZIPs to route-aware resources", () => {
  const page = readFileSync("app/stability/page.tsx", "utf8")
  const component = readFileSync("components/guardian/route-aware-resource-planner.tsx", "utf8")
  assert.match(page, /nextRouteAwarePlan/)
  assert.match(page, /RouteAwareResourcePlanner/)
  assert.match(page, /Include a 5-digit ZIP/)
  assert.match(component, /does not track your route or background location/i)
  assert.match(component, /Near the appointment ZIP is not the same as “on your route.”/)
  assert.match(component, /two hours before/)
})
