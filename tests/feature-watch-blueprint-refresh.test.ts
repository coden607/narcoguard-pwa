import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("installed PWA refresh includes the Rev 5 watch route and blueprint assets", () => {
  const sw = readFileSync("public/sw.js", "utf8")
  const watch = readFileSync("app/watch/page.tsx", "utf8")

  assert.match(sw, /"\/watch"/)
  assert.match(sw, /ng46-rev5-blueprint\.svg/)
  assert.match(sw, /ng40-rev5-blueprint\.svg/)
  assert.match(sw, /narcoguard-shell-v8/)
  assert.match(watch, /ng46-rev5-blueprint\.svg\?rev=5-2026-10-12/)
  assert.match(watch, /ng40-rev5-blueprint\.svg\?rev=5-2026-10-12/)
})
