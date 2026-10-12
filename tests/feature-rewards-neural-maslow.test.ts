import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("stability page preloads Maslow resources from neural need forecasts", () => {
  const page = read("app/stability/page.tsx")
  assert.match(page, /neuralNeedForecasts/)
  assert.match(page, /forecast\.score >= 65/)
  assert.match(page, /neuralNeeds/)
  assert.match(page, /MaslowResourceAutomation needs=\{resourceNeeds\}/)
  assert.match(page, /Neural Maslow forecast/)
})

test("momentum rewards are local opt-in and non-monetary", () => {
  const panel = read("components/guardian/guardian-rewards-panel.tsx")
  const rewards = read("lib/guardian-rewards.ts")
  assert.match(panel, /Points have no cash value/)
  assert.match(panel, /no streak penalties or resets/i)
  assert.match(rewards, /completedPlans \* 10/)
  assert.doesNotMatch(rewards, /returnToUse/)
})

test("adaptive Guardian explicitly relearns locally as voluntary history changes", () => {
  const panel = read("components/guardian/adaptive-guardian-panel.tsx")
  const privacy = read("app/privacy/page.tsx")
  assert.match(panel, /retrain.*local models/i)
  assert.match(privacy, /models can relearn when your local history changes/i)
  assert.match(privacy, /not calibrated probabilities/i)
})
