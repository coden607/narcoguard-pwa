import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("predicted resource watches require explicit opt-in and expire after 24 hours", () => {
  const panel = read("components/resources/predicted-resource-watch-panel.tsx")
  assert.match(panel, /Enable 24-hour predicted watches/)
  assert.match(panel, /Notification\.requestPermission/)
  assert.match(panel, /getCurrentPosition/)
  assert.match(panel, /They expire after 24 hours/)
  assert.match(panel, /neural history and score stay on this device/)
})

test("stability routes learned and neural predicted needs into the optional watch panel", () => {
  const page = read("app/stability/page.tsx")
  assert.match(page, /predictedWatchNeeds/)
  assert.match(page, /learnedNeeds/)
  assert.match(page, /neuralNeeds/)
  assert.match(page, /PredictedResourceWatchPanel predictedNeeds=\{predictedWatchNeeds\}/)
})
