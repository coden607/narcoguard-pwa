import { strict as assert } from "node:assert"
import { test } from "node:test"
import { BOM_40, BOM_46 } from "../lib/watch-bom"
import { REV5_POWER_ARCHITECTURE, WATCH_REV5_MODULES } from "../lib/watch-rev5"

test("Rev 5 defines crown, multi-source harvesting, reserve and privacy camera", () => {
  const ids = new Set(WATCH_REV5_MODULES.map((module) => module.id))
  for (const id of ["crown-generator", "solar-ring", "thermoelectric", "automatic-rotor", "reserve-storage", "camera"]) {
    assert.ok(ids.has(id), `missing ${id}`)
  }
  assert.equal(REV5_POWER_ARCHITECTURE.primaryCharging, "sealed Qi receiver")
  assert.match(REV5_POWER_ARCHITECTURE.rule, /none are represented as capable of continuously powering/i)
})

test("camera remains optional, physically private and independent of overdose detection", () => {
  const camera = WATCH_REV5_MODULES.find((module) => module.id === "camera")
  assert.ok(camera)
  const rules = camera.designRules.join(" ")
  assert.match(rules, /off by default/i)
  assert.match(rules, /mechanical shutter/i)
  assert.match(rules, /hardware-gated/i)
  assert.match(rules, /privacy indicator/i)
  assert.match(rules, /never required for overdose detection/i)
  assert.match(rules, /explicitly sends or shares/i)
})

test("both size BOMs carry research harvesting and camera categories without inflating quoted build cost", () => {
  for (const bom of [BOM_46, BOM_40]) {
    const harvest = bom.find((category) => /Energy Harvesting/.test(category.category))
    const camera = bom.find((category) => /Camera & Privacy/.test(category.category))
    assert.ok(harvest)
    assert.ok(camera)
    assert.ok(harvest.items.some((item) => /crown/i.test(item.name)))
    assert.ok(harvest.items.some((item) => /rotor/i.test(item.name)))
    assert.ok(camera.items.some((item) => /CameraCubeChip/i.test(item.name)))
    assert.ok([...harvest.items, ...camera.items].every((item) => item.unitPrice === 0), "unquoted Rev 5 research parts must not silently alter cost estimates")
  }
})
