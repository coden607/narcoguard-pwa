import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { DEBRIEF_FEELINGS, DEBRIEF_LINES, suggestionsFor } from "../lib/responder-debrief"

test("every feeling has suggestions and no answer means none", () => {
  for (const feeling of DEBRIEF_FEELINGS) assert.ok(suggestionsFor(feeling.id).length > 0)
  assert.deepEqual(suggestionsFor(null), [])
})

test("overwhelmed points to 988 right away", () => {
  assert.ok(suggestionsFor("overwhelmed").some((line) => /988/.test(line)))
  assert.deepEqual(DEBRIEF_LINES.map((line) => line.tel), ["988", "18009855990"])
})

test("the debrief is skippable and saves nothing", () => {
  assert.match(readFileSync("app/debrief/page.tsx", "utf8"), /Skip this/)
  const component = readFileSync("components/harm-reduction/responder-debrief.tsx", "utf8")
  assert.doesNotMatch(component, /localStorage|sessionStorage|indexedDB|fetch\(/)
})
