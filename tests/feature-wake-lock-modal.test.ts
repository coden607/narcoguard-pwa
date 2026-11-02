import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("the emergency modal keeps the screen on while open", () => {
  assert.match(readFileSync("components/emergency/emergency-modal.tsx", "utf8"), /useWakeLock\(open\)/)
})
