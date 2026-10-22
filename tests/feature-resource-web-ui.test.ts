import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("resource finder keeps Brave/Groq web leads separate from verified directory cards", async () => {
  const source = await readFile(new URL("../components/resources/needs-finder.tsx", import.meta.url), "utf8")
  assert.match(source, /Fresh web leads/)
  assert.match(source, /Found live through Brave Search/)
  assert.match(source, /categorized by Groq/)
  assert.match(source, /not verified availability/)
  assert.match(source, /Check the provider page or call before traveling/)
  assert.match(source, /data-testid="fresh-web-leads"/)
})
