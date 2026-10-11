import { strict as assert } from "node:assert"
import { test } from "node:test"
import { readFile } from "node:fs/promises"

test("homepage branded backdrop stays decorative and motion-aware", async () => {
  const backdrop = await readFile(new URL("../components/effects/brand-backdrop.tsx", import.meta.url), "utf8")
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8")

  assert.match(backdrop, /aria-hidden="true"/)
  assert.match(backdrop, /pointer-events-none/)
  assert.match(backdrop, /narcoguard-logo\.png/)
  assert.match(backdrop, /motion-reduce:animate-none/)
  assert.match(page, /<BrandBackdrop \/>/)
  assert.match(page, /w-20 h-20 sm:w-24 sm:h-24/)
  assert.doesNotMatch(page, /animate-pulse" \/>/)
})
