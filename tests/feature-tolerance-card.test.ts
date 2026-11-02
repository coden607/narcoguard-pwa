import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { TOLERANCE_INTRO, TOLERANCE_SOURCES, TOLERANCE_TIPS } from "../lib/tolerance-card"

test("the card names the breaks that lower tolerance", () => {
  for (const word of ["jail", "detox", "hospital"]) assert.match(TOLERANCE_INTRO, new RegExp(word))
})

test("the card advises starting low, not using alone and carrying naloxone", () => {
  const text = TOLERANCE_TIPS.join(" ")
  assert.match(text, /much less/)
  assert.match(text, /Don't use alone/)
  assert.match(text, /naloxone/)
})

test("the card is static, cited and shown on Stay safer", () => {
  assert.ok(TOLERANCE_SOURCES.every((source) => source.url.startsWith("https://")))
  const component = readFileSync("components/harm-reduction/tolerance-card.tsx", "utf8")
  assert.doesNotMatch(component, /localStorage|fetch\(|useState/)
  assert.match(readFileSync("app/safer-use/page.tsx", "utf8"), /<ToleranceCard \/>/)
  assert.match(readFileSync("lib/tolerance-card.ts", "utf8"), /NEEDS CLINICAL REVIEW/)
})
