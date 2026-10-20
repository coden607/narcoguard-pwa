import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("global styles preserve reduced motion and mobile accessibility safeguards", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  assert.match(css, /prefers-reduced-motion:\s*reduce/)
  assert.match(css, /:focus-visible/)
  assert.match(css, /@media \(pointer:\s*coarse\)/)
  assert.match(css, /min-height:\s*44px/)
  assert.match(css, /overflow-wrap:\s*anywhere/)
})
