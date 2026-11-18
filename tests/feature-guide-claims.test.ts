import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("setup does not advertise virtual reality or augmented-reality training", () => {
  const onboarding = readFileSync("components/onboarding/onboarding-flow.tsx", "utf8")
  assert.doesNotMatch(onboarding, /VR simulation|AR-guided/)
  assert.match(onboarding, /href="\/ar"/)
  assert.match(onboarding, /href="\/hero-signup"/)
  assert.match(onboarding, /There is no virtual-reality course/)
  assert.match(onboarding, /stays here, and nobody is notified/)
})

test("the watch page labels design checks as model figures", () => {
  const page = readFileSync("app/watch/page.tsx", "utf8")
  assert.match(page, /Design checks, not a running watch/)
  assert.match(page, /not a sensor simulation/)
  assert.doesNotMatch(page, /simulationPanels/)
})
