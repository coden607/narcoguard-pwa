import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("privacy notice discloses Brave ZIP processing and Groq ranking boundary", async () => {
  const privacy = await readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8")
  const finder = await readFile(new URL("../components/resources/needs-finder.tsx", import.meta.url), "utf8")
  assert.match(privacy, /Brave Search a generic/)
  assert.match(privacy, /retained for up to 90 days/)
  assert.match(privacy, /not used for model training/)
  assert.match(privacy, /Zero Data Retention/)
  assert.match(finder, /generic resource categories \+ the ZIP to Brave Search/)
  assert.match(finder, /typed need description and GPS coordinates are not sent to Brave/)
})
