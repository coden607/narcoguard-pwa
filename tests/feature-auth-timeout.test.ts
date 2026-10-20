import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("all Supabase auth requests have a bounded default timeout without overriding explicit signals", async () => {
  const source = await readFile(new URL("../lib/supabase-auth.ts", import.meta.url), "utf8")
  assert.match(source, /signal: init\.signal \?\? AbortSignal\.timeout\(12_000\)/)
})
