import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("installed PWA refresh includes the current Rev 5 watch visuals, fabrication CAD, and PCBWay engineering surface", () => {
  const sw = readFileSync("public/sw.js", "utf8")
  const watch = readFileSync("app/watch/page.tsx", "utf8")
  const drawing = readFileSync("components/watch/engineering-drawing.tsx", "utf8")
  const model3d = readFileSync("components/watch/watch-3d.tsx", "utf8")
  const ng46 = readFileSync("public/images/ng46-rev5-blueprint.svg", "utf8")
  const ng40 = readFileSync("public/images/ng40-rev5-blueprint.svg", "utf8")

  assert.match(sw, /"\/watch"/)
  assert.match(sw, /ng46-rev5-blueprint\.svg/)
  assert.match(sw, /ng40-rev5-blueprint\.svg/)
  assert.match(sw, /narcoguard-shell-v18/)

  assert.match(watch, /ng46-rev5-blueprint\.svg\?rev=5-2026-10-14/)
  assert.match(watch, /ng40-rev5-blueprint\.svg\?rev=5-2026-10-14/)
  assert.match(watch, /data-testid="rev5-concept-visual-gallery"/)
  assert.match(watch, /ng-rev5-hero-titanium\.jpg\?rev=titanium-solar-2026-11-18/)
  assert.match(watch, /ng-rev5-exploded-titanium\.jpg\?rev=titanium-solar-2026-11-18/)
  assert.match(watch, /Primary visual direction:/)
  assert.match(watch, /premium solid metal titanium link bracelet with solar cells integrated into the band/)
  assert.match(watch, /rose gold titanium/)
  for (const concept of [
    "ng-rev5-hero-titanium.jpg",
    "ng-rev5-exploded-titanium.jpg",
    "ng-titanium-3d.png",
    "ng-blueprint.jpg",
  ]) {
    assert.match(watch, new RegExp(concept.replace(".", "\\.")), concept)
  }
  assert.doesNotMatch(watch, /ng-watch-hero\.jpg/)
  assert.doesNotMatch(watch, /ng-sizes-render\.jpg/)
  assert.doesNotMatch(watch, /watch-on-wrist-lifestyle\.jpg/)
  assert.doesNotMatch(watch, /ng-exploded-view\.jpg/)
  assert.doesNotMatch(watch, /ng-modular-exploded\.jpg/)
  assert.doesNotMatch(watch, /ng-blueprint-detailed\.jpg/)
  assert.doesNotMatch(watch, /quick-release silicone/)
  assert.match(watch, /Concept artwork — use the Blueprint, 3D, CAD, BOM, and PCBWay sections for current engineering status/)

  assert.match(drawing, /Rev 5 concept engineering drawing/)
  assert.doesNotMatch(drawing, /Rev 4(?:\.2)? concept engineering drawing/)
  assert.match(model3d, /Rev 5 3D model/)

  for (const blueprint of [ng46, ng40]) {
    assert.match(blueprint, /8-layer HDI safety\/core carrier/)
    assert.match(blueprint, /PCBWay review candidate/)
    assert.match(blueprint, /W5\+\/X35 compute\/RF kept behind vendor-approved interface/)
    assert.match(blueprint, /GERBER\/NC DRILL RELEASE BLOCKED/)
    assert.doesNotMatch(blueprint, /supplier CAD, routed PCB, tolerances, antenna and thermal validation still required/)
  }

  assert.match(watch, /BOM_ICONS/)
  assert.match(watch, /Interactive 3D view/)
  assert.match(watch, /Rev 5 research: crown generator/)
  assert.match(watch, /Concept CAD status/)
  assert.match(watch, /not offered for download/)
  assert.doesNotMatch(watch, /Download full fabrication package/)
  assert.match(watch, /Rev 5 concept CAD/)
  assert.match(watch, /PCBWay engineering package/)
  assert.match(watch, /watch-pcb\.yml/)
  assert.match(watch, /Gerber\/NC-drill release remains blocked/)
  assert.match(watch, /Body-heat thermoelectric harvesting was reviewed and is not fitted/)
})
