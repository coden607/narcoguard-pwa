import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("resource finder cancels superseded requests and rejects stale responses", async () => {
  const source = await readFile(new URL("../components/resources/needs-finder.tsx", import.meta.url), "utf8")
  assert.match(source, /searchGeneration = useRef\(0\)/)
  assert.match(source, /searchAbort\.current\?\.abort\(\)/)
  assert.match(source, /signal: controller\.signal/)
  assert.match(source, /generation === searchGeneration\.current/)
  assert.match(source, /error\.name === "AbortError"/)
})
