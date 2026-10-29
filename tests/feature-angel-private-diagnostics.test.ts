import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("Angel diagnostics correlate failures without logging message content", async () => {
  const source = await readFile(new URL("../app/api/angel/route.ts", import.meta.url), "utf8")
  assert.match(source, /const requestId = crypto\.randomUUID\(\)/)
  assert.match(source, /X-NarcoGuard-Request-Id/)
  assert.match(source, /Server-Timing/)
  assert.match(source, /X-NarcoGuard-AI-Provider/)
  assert.match(source, /\[angel:\$\{requestId\}\]/)
  assert.match(source, /servedBy = endpointFor\(provider, first\.choice\)\.name/)
  assert.match(source, /status: 502, headers: headers\(\)/)
  assert.doesNotMatch(source, /console\.(?:log|info|warn)\([^\n]*latest\.content/)
  assert.doesNotMatch(source, /console\.(?:log|info|warn)\([^\n]*messages/)
})
