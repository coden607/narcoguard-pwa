import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { PHARMACY_CARD_LINES, PHARMACY_CARD_SOURCES, PHARMACY_CARD_TIPS } from "../lib/pharmacy-card"

test("the card asks for naloxone without requiring a reason", () => {
  assert.match(PHARMACY_CARD_LINES[0], /naloxone/i)
  assert.ok(PHARMACY_CARD_LINES.some((line) => /over the counter/i.test(line)))
  assert.ok(PHARMACY_CARD_TIPS.some((tip) => /don't have to say who it's for/i.test(tip)))
})

test("the card says state rules vary and cites official sources", () => {
  assert.ok(PHARMACY_CARD_TIPS.some((tip) => /differ by state/i.test(tip)))
  for (const source of PHARMACY_CARD_SOURCES) assert.match(source.url, /^https:\/\//)
  assert.ok(PHARMACY_CARD_SOURCES.some((source) => source.url.includes("fda.gov")))
})

test("the page shows the sources and the not-medical-advice note", () => {
  const page = readFileSync("app/naloxone-card/page.tsx", "utf8")
  assert.match(page, /SourceList/)
  assert.doesNotMatch(page, /localStorage|fetch\(/)
})
