import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("installed PWA refresh includes the Rev 5 watch route and blueprint assets", () => {
  const sw = readFileSync("public/sw.js", "utf8")
  const watch = readFileSync("app/watch/page.tsx", "utf8")

  assert.match(sw, /"\/watch"/)
  assert.match(sw, /ng46-rev5-blueprint\.svg/)
  assert.match(sw, /ng40-rev5-blueprint\.svg/)
  assert.match(sw, /narcoguard-shell-v10/)
  assert.match(watch, /ng46-rev5-blueprint\.svg\?rev=5-2026-10-13/)
  assert.match(watch, /ng40-rev5-blueprint\.svg\?rev=5-2026-10-13/)
  assert.doesNotMatch(watch, /ng-sizes-render\.jpg/)
  assert.match(watch, /BOM_ICONS/)
  assert.match(watch, /Interactive 3D view/)
  assert.match(watch, /Rev 5 research: crown generator/)
  assert.match(watch, /STEP \/ STL CAD package/)
  assert.match(watch, /narcoguard-rev5-cad/)
  assert.match(watch, /ng46-rev5-concept\.step/)
  assert.match(watch, /ng40-rev5-concept\.stl/)
})
