import assert from "node:assert/strict"
import { test } from "node:test"
import { FALLBACK_COPY } from "../components/common/emergency-fallback"
import { OVERDOSE_STEPS } from "../components/emergency/overdose-steps"
import { GOOD_SAMARITAN_NOTE, RESTOCK_STEPS } from "../lib/aftercare"
import { CALL_SCRIPT, CALL_SCRIPT_TEXT_NOTE } from "../lib/call-script"
import { PHARMACY_CARD_LINES, PHARMACY_CARD_TIPS } from "../lib/pharmacy-card"
import { gradeLevel, gradeLevelOfLines, syllables } from "../lib/reading-level"
import { RESCUE_BREATHING_SETUP } from "../lib/rescue-breathing"
import { TOLERANCE_TIPS } from "../lib/tolerance-card"
import { WOUND_CARE_STEPS, WOUND_DANGER_SIGNS } from "../lib/wound-care"

const MAX_GRADE = 6
// A single emergency line may run higher: one long word ("recovery position") swings a short sentence.
const MAX_LINE_GRADE = 9

// Copy someone reads during or right after an overdose. Must stay at grade 6 or lower.
const ENFORCED: Record<string, readonly string[]> = {
  "overdose steps": OVERDOSE_STEPS,
  "911 call script": [...CALL_SCRIPT.flatMap((line) => [line.say, line.tip]), CALL_SCRIPT_TEXT_NOTE],
  "error screen": Object.values(FALLBACK_COPY),
  "rescue breathing setup": RESCUE_BREATHING_SETUP,
  "restock steps": RESTOCK_STEPS,
  "wound care steps": WOUND_CARE_STEPS,
  "wound danger signs": WOUND_DANGER_SIGNS,
  "tolerance tips": TOLERANCE_TIPS,
  "pharmacy card": PHARMACY_CARD_LINES,
}

// Reported only: legal or pharmacy wording that needs a reviewed rewrite before it is enforced.
const REPORTED: Record<string, readonly string[]> = {
  "Good Samaritan note": [GOOD_SAMARITAN_NOTE],
  "pharmacy tips": PHARMACY_CARD_TIPS,
}

test(`emergency copy reads at grade ${MAX_GRADE} or lower`, () => {
  for (const [name, lines] of Object.entries(ENFORCED)) {
    const grade = gradeLevelOfLines(lines)
    assert.ok(grade <= MAX_GRADE, `${name} reads at grade ${grade.toFixed(1)}; simplify it to ${MAX_GRADE} or lower`)
  }
  for (const step of OVERDOSE_STEPS) {
    assert.ok(gradeLevel(step) <= MAX_LINE_GRADE, `"${step}" reads at grade ${gradeLevel(step).toFixed(1)}`)
  }
})

test("other safety copy above grade 6 is reported (warning, not a failure)", (t) => {
  for (const [name, lines] of Object.entries(REPORTED)) {
    const grade = gradeLevelOfLines(lines)
    if (grade > MAX_GRADE) t.diagnostic(`READING LEVEL: ${name} reads at grade ${grade.toFixed(1)}`)
  }
})

test("the scorer counts syllables and grades text sensibly", () => {
  assert.equal(syllables("call"), 1)
  assert.equal(syllables("breathing"), 2)
  assert.equal(syllables("naloxone"), 3)
  assert.ok(gradeLevel("Call 911. Stay with them.") < 3)
  assert.ok(gradeLevel("Administer intranasal naloxone hydrochloride immediately following identification of respiratory depression.") > 12)
})
