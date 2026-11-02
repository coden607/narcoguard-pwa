import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { CALL_SCRIPT, CALL_SCRIPT_REVIEWED, CALL_SCRIPT_SOURCES, CALL_SCRIPT_TEXT_NOTE } from "../lib/call-script"

test("the script leads with not breathing, then location, naloxone, and staying on the line", () => {
  assert.match(CALL_SCRIPT[0].say, /not breathing/)
  assert.match(CALL_SCRIPT[1].tip, /address/)
  assert.match(CALL_SCRIPT[2].say, /naloxone/)
  assert.match(CALL_SCRIPT[3].tip, /Do not hang up/)
  assert.match(CALL_SCRIPT_TEXT_NOTE, /^Call if you can/)
})

test("the script is sourced, dated and has no dosing or medical claims", () => {
  assert.match(CALL_SCRIPT_REVIEWED, /^\d{4}-\d{2}-\d{2}$/)
  assert.ok(CALL_SCRIPT_SOURCES.length >= 2)
  for (const source of CALL_SCRIPT_SOURCES) assert.match(source.url, /^https:\/\/(www\.)?(samhsa|cdc|library\.samhsa|fcc)\./)
  for (const line of CALL_SCRIPT) assert.doesNotMatch(`${line.say} ${line.tip}`, /\bmg\b|milligram/i)
})

test("the page has Call 911 and the bystander page links to it", () => {
  assert.match(readFileSync("app/911-script/page.tsx", "utf8"), /href="tel:911"/)
  assert.match(readFileSync("app/bystander/page.tsx", "utf8"), /href="\/911-script"/)
})
