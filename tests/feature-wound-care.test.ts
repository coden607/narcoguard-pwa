import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { WOUND_CARE_FINDERS, WOUND_CARE_SOURCES, WOUND_CARE_STEPS, WOUND_DANGER_SIGNS } from "../lib/wound-care"

test("the guide covers cleaning, covering and not injecting near a wound", () => {
  const text = WOUND_CARE_STEPS.join(" ")
  assert.match(text, /clean/)
  assert.match(text, /dressing/)
  assert.match(text, /Don't inject into or near a wound/)
})

test("danger signs include infection and dead tissue", () => {
  const text = WOUND_DANGER_SIGNS.join(" ")
  assert.match(text, /Fever/)
  assert.match(text, /black/)
})

test("the page never asks for photos and sends nothing", () => {
  const page = readFileSync("app/wound-care/page.tsx", "utf8")
  assert.match(page, /never asks for photos/)
  assert.doesNotMatch(page, /type="file"|capture=|getUserMedia|fetch\(|localStorage/)
  assert.match(readFileSync("lib/wound-care.ts", "utf8"), /NEEDS CLINICAL REVIEW/)
})

test("finders and sources are https public pages", () => {
  for (const link of [...WOUND_CARE_FINDERS.flatMap((group) => group.links), ...WOUND_CARE_SOURCES]) assert.match(link.url, /^https:\/\//)
})
