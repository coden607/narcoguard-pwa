import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("auth UI preserves input and blocks network actions while offline", async () => {
  const source = await readFile(new URL("../app/auth/page.tsx", import.meta.url), "utf8")
  assert.match(source, /navigator\.onLine/)
  assert.match(source, /window\.addEventListener\("offline"/)
  assert.match(source, /You are offline\. Your details are still here/)
  assert.match(source, /disabled=\{!online \|\| busy/)
  assert.match(source, /aria-busy=\{busy\}/)
  assert.match(source, /aria-live="polite"/)
  assert.match(source, /error instanceof TypeError/)
})
