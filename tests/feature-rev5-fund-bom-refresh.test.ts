import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("fundraising surfaces use approved titanium 3D visuals and bounded copy", () => {
  const fund = read("app/fund/page.tsx")
  assert.match(fund, /ng-rev5-hero-titanium\.jpg/)
  assert.match(fund, /ng-rev5-exploded-titanium\.jpg/)
  assert.match(fund, /manufacturing CAD and internal fit remain unverified/)
  assert.match(fund, /titanium link bracelet with solar cells integrated into the band/)
  assert.doesNotMatch(fund, /ng-titanium-3d\.png/)
  assert.doesNotMatch(fund, /ng-sizes-render\.jpg/)
  assert.doesNotMatch(fund, /watch-on-wrist-lifestyle\.jpg/)
  assert.doesNotMatch(fund, /ng-watch-hero\.jpg/)
  assert.doesNotMatch(fund, /ng-exploded-view\.jpg/)
  assert.doesNotMatch(fund, /women(?:&apos;|')s fit/i)
})

test("public Rev 5 BOM removes stale Rev 4 and injector-specific public claims", () => {
  const bom = read("lib/watch-bom.ts")
  assert.match(bom, /Modular Auto-Injector Research Pod/)
  assert.match(bom, /No NarcoGuard watch currently injects naloxone/)
  assert.doesNotMatch(bom, /NG-CASE-TI6AL4V-R4/)
  assert.doesNotMatch(bom, /NG-PCBA-R4/)
  assert.doesNotMatch(bom, /Evzio/i)
  assert.doesNotMatch(bom, /30-gauge/i)
  assert.doesNotMatch(bom, /2 mg in 0\.4 mL/i)
  assert.doesNotMatch(bom, /plunger/i)
  assert.doesNotMatch(bom, /Medical Silicone Sport Strap/)
  assert.doesNotMatch(bom, /LSR silicone strap/)
  assert.match(bom, /Titanium solar-inlay link bracelet/)
})

test("installed PWA refreshes Support and icon URLs with shell v17", () => {
  const sw = read("public/sw.js")
  const manifest = read("app/manifest.ts")
  assert.match(sw, /narcoguard-shell-v20/)
  assert.match(sw, /"\/fund"/)
  assert.match(sw, /icon-192\.png\?v=9/)
  assert.match(manifest, /icon-192\.png\?v=9/)
  assert.match(manifest, /icon-512\.png\?v=9/)
})
