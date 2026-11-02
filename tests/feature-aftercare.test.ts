import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { AFTERCARE_SOURCES, AFTERCARE_STEPS, GOOD_SAMARITAN_NOTE, RESTOCK_STEPS } from "../lib/aftercare"

test("aftercare says naloxone can wear off in 30 to 90 minutes and to keep 911 coming", () => {
  assert.match(AFTERCARE_STEPS[0].title, /911/)
  assert.match(AFTERCARE_STEPS[0].detail, /30 to 90 minutes/)
})

test("aftercare covers staying, recovery position, repeat dose and rescue breaths", () => {
  const text = AFTERCARE_STEPS.map((step) => `${step.title} ${step.detail}`).join(" ")
  assert.match(text, /Stay with them/)
  assert.match(text, /on their side/i)
  assert.match(text, /another dose/i)
  assert.match(text, /one breath every 5 seconds/)
})

test("Good Samaritan note says protections differ by state; restock is included", () => {
  assert.match(GOOD_SAMARITAN_NOTE, /differs by state/)
  assert.ok(RESTOCK_STEPS.some((step) => /Replace the naloxone/.test(step)))
})

test("sources are cited and the source file flags clinical review", () => {
  assert.ok(AFTERCARE_SOURCES.some((source) => source.url.includes("cdc.gov")))
  assert.ok(AFTERCARE_SOURCES.some((source) => source.url.includes("samhsa.gov")))
  assert.match(readFileSync("lib/aftercare.ts", "utf8"), /NEEDS CLINICAL REVIEW/)
  assert.doesNotMatch(readFileSync("components/harm-reduction/aftercare.tsx", "utf8"), /localStorage|fetch\(/)
})
