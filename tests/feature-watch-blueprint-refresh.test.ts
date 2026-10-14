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
  assert.match(sw, /narcoguard-shell-v12/)

  assert.match(watch, /ng46-rev5-blueprint\.svg\?rev=5-2026-10-14/)
  assert.match(watch, /ng40-rev5-blueprint\.svg\?rev=5-2026-10-14/)
  assert.match(watch, /data-testid="rev5-concept-visual-gallery"/)
  assert.match(watch, /ng-blueprint-detailed\.jpg\?rev=visual-2026-10-14/)
  assert.match(watch, /ng-exploded-view\.jpg\?rev=visual-2026-10-14/)
  assert.match(watch, /ng-modular-exploded\.jpg\?rev=visual-2026-10-14/)
  assert.match(watch, /Primary visual direction:/)
  for (const concept of [
    "ng-watch-hero.jpg",
    "ng-blueprint.jpg",
    "ng-blueprint-detailed.jpg",
    "ng-exploded-view.jpg",
    "ng-modular-exploded.jpg",
    "ng-sizes-render.jpg",
    "watch-on-wrist-lifestyle.jpg",
  ]) {
    assert.match(watch, new RegExp(concept.replace(".", "\\.")), concept)
  }
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
  assert.match(watch, /STEP \/ STL CAD package/)
  assert.match(watch, /narcoguard-rev5-cad/)
  assert.match(watch, /Rev 5 Fabrication CAD/)
  assert.match(watch, /Complete \+ exploded STEP\/STL/)
  assert.match(watch, /assemblies\/\[variant\]-assembly\.step/)
  assert.match(watch, /assemblies\/\[variant\]-exploded\.step/)
  assert.match(watch, /profiles\/\[profile\]\.dxf/)
  assert.match(watch, /tolerance-gdt\.csv/)
  assert.match(watch, /gdt-plan\.svg/)
  assert.match(watch, /manifest\.json/)
  assert.match(watch, /PCBWay engineering package/)
  assert.match(watch, /watch-pcb\.yml/)
  assert.match(watch, /Gerber\/NC-drill release remains blocked/)
})
