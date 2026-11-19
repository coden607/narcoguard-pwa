// Copyright (c) 2026 Stephen Blanford / NarcoGuard. All rights reserved. Not licensed under MIT.

import { strict as assert } from "node:assert"
import { existsSync, readFileSync } from "node:fs"
import { test } from "node:test"

const NOTICE = "Copyright (c) 2026 Stephen Blanford / NarcoGuard. All rights reserved. Not licensed under MIT."

test("manufacturing sources are not in the public tree", () => {
  assert.equal(existsSync("hardware/cad"), false)
  assert.equal(existsSync("hardware/pcb"), false)
  assert.equal(existsSync("hardware/fab"), false)
})

test("the public license excludes new watch hardware from the MIT grant", () => {
  const license = readFileSync("LICENSE", "utf8")
  const pkg = JSON.parse(readFileSync("package.json", "utf8"))
  assert.match(license, /2026-11-18/)
  assert.match(license, /excluded from the MIT/)
  assert.equal(pkg.license, "SEE LICENSE IN LICENSE")
  for (const path of [
    "lib/watch-bom.ts",
    "lib/watch-design.ts",
    "lib/watch-geometry.ts",
    "lib/watch-rev5.ts",
    "public/images/ng46-rev5-blueprint.svg",
    "public/images/ng40-rev5-blueprint.svg",
  ]) {
    assert.match(readFileSync(path, "utf8"), new RegExp(NOTICE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), path)
  }
})

test("the public design target is IP68 at 1.5 m for 30 min and an 8-layer carrier", () => {
  const design = readFileSync("lib/watch-design.ts", "utf8")
  const bom = readFileSync("docs/NG-BOM.md", "utf8")
  assert.match(design, /1\.5 m for 30 min/)
  assert.match(bom, /1\.5 m for 30 minutes/)
  assert.match(readFileSync("lib/watch-bom.ts", "utf8"), /8-layer 1\+6\+1/)
  assert.doesNotMatch(readFileSync("lib/watch-bom.ts", "utf8"), /10-Layer/)
  assert.doesNotMatch(readFileSync("lib/watch-bom.ts", "utf8"), /CYW43022/)
  assert.doesNotMatch(readFileSync("lib/watch-bom.ts", "utf8"), /760308103/)
  assert.doesNotMatch(readFileSync("lib/watch-bom.ts", "utf8"), /MLX90632SFE/)
})
