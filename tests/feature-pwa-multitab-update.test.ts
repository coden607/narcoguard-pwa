import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("PWA deployment update readiness synchronizes across open tabs", async () => {
  const source = await readFile(new URL("../components/pwa/service-worker-register.tsx", import.meta.url), "utf8")
  assert.match(source, /UPDATE_READY_KEY/)
  assert.match(source, /window\.addEventListener\("storage", syncUpdateAcrossTabs\)/)
  assert.match(source, /window\.localStorage\.setItem\(UPDATE_READY_KEY, version\)/)
  assert.match(source, /window\.removeEventListener\("storage", syncUpdateAcrossTabs\)/)
  assert.match(source, /window\.localStorage\.removeItem\(UPDATE_READY_KEY\)/)
  assert.match(source, /window\.localStorage\.getItem\(UPDATE_READY_KEY\)/)
})
