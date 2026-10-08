import { strict as assert } from "node:assert"
import { test } from "node:test"
import { watchDesignModel } from "../lib/watch-design"
import { ENVELOPE, GEOMETRY_40, GEOMETRY_46, LAYERS, PARTS, planInterferences } from "../lib/watch-geometry"
import { WATCH_COMPONENTS, WATCH_COMPONENTS_40, calloutNumber } from "../lib/watch-components"
import { BOM_40, BOM_46, bomTotals } from "../lib/watch-bom"
import { PROTOTYPE_UNIT_COST } from "../lib/funding-goal"

test("the layer stack runs from the case back to the full case thickness without overlaps", () => {
  assert.equal(LAYERS[0].z0, 0)
  assert.equal(LAYERS.at(-1)!.z1, watchDesignModel.caseThicknessMm)
  for (let i = 1; i < LAYERS.length; i++) assert.ok(LAYERS[i].z0 >= LAYERS[i - 1].z1, `${LAYERS[i].id} overlaps ${LAYERS[i - 1].id}`)
})

test("no board part crosses the usable internal radius and visible parts do not overlap", () => {
  assert.deepEqual(planInterferences(), [])
  const visible = PARTS.filter((part) => !part.hidden && part.id !== "pcb" && part.id !== "pod")
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const [a, b] = [visible[i], visible[j]]
      const overlap = Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.d + b.d) / 2
      assert.ok(!overlap, `${a.id} overlaps ${b.id}`)
    }
  }
  assert.deepEqual(planInterferences([{ id: "x", label: "", x: 18, y: 8, z: 0, w: 4, d: 4, h: 1 }]), ["x"])
})

test("parts sit inside their layers and the medication pod stays outside the sealed core", () => {
  const compute = LAYERS.find((layer) => layer.id === "compute")!
  for (const id of ["soc", "connectivity", "mcu"]) {
    const part = PARTS.find((entry) => entry.id === id)!
    assert.ok(part.z >= compute.z0 && part.z + part.h <= compute.z1 + 1e-9, `${id} leaves the compute plane`)
  }
  const pod = PARTS.find((entry) => entry.id === "pod")!
  assert.ok(Math.abs(pod.y) - pod.d / 2 >= ENVELOPE.caseRadius - 1.5, "pod must sit in the lug, outside the core")
  assert.equal(pod.h, watchDesignModel.medicationPod.targetMaximumHeightMm)
  assert.equal(ENVELOPE.displayDiameter, 36.8)
})

test("every part callout refers to a numbered component", () => {
  for (const part of PARTS) if (part.callout) assert.ok(calloutNumber(part.callout) > 0, part.callout)
  assert.equal(calloutNumber("snapdragon"), 1)
  assert.equal(new Set(WATCH_COMPONENTS.map((component) => component.id)).size, WATCH_COMPONENTS.length)
})

test("the 40 mm layout fits its smaller board and case with the same layer rules", () => {
  const g = GEOMETRY_40
  assert.equal(g.LAYERS[0].z0, 0)
  assert.equal(g.LAYERS.at(-1)!.z1, g.model.caseThicknessMm)
  for (let i = 1; i < g.LAYERS.length; i++) assert.ok(g.LAYERS[i].z0 >= g.LAYERS[i - 1].z1, `${g.LAYERS[i].id} overlaps`)
  assert.deepEqual(planInterferences(g.PARTS, g.ENVELOPE.internalRadius), [])
  const visible = g.PARTS.filter((part) => !part.hidden && part.id !== "pcb" && part.id !== "pod")
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const [a, b] = [visible[i], visible[j]]
      assert.ok(!(Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.d + b.d) / 2), `${a.id} overlaps ${b.id}`)
    }
  }
  assert.ok(g.ENVELOPE.displayDiameter < g.ENVELOPE.internalRadius * 2, "display must fit inside the case wall")
  assert.ok(g.ENVELOPE.strapWidth >= g.model.medicationPod.module.widthMm, "pod lug must hold the pod")
  assert.equal(g.ENVELOPE.caseRadius * 2, 40)
  assert.ok(g.ENVELOPE.caseRadius < GEOMETRY_46.ENVELOPE.caseRadius)
  for (const spec of [...g.CALLOUTS.plan, ...g.CALLOUTS.section]) assert.ok(calloutNumber(spec.id) > 0, spec.id)
})

test("the 40 mm keeps every numbered component and safety function of the 46 mm", () => {
  assert.deepEqual(WATCH_COMPONENTS_40.map((c) => c.id), WATCH_COMPONENTS.map((c) => c.id))
  assert.match(WATCH_COMPONENTS_40.find((c) => c.id === "battery")!.name, /300mAh/)
  assert.equal(WATCH_COMPONENTS_40.find((c) => c.id === "naloxone")!.description, WATCH_COMPONENTS.find((c) => c.id === "naloxone")!.description)
})

test("the bills of materials match the funding goal and differ only where the case size requires", () => {
  const big = bomTotals(BOM_46)
  const small = bomTotals(BOM_40)
  assert.equal(big.complete, PROTOTYPE_UNIT_COST)
  assert.equal(small.count, big.count)
  assert.ok(small.complete < big.complete)
  const chips = (bom: typeof BOM_46, name: string) => bom.find((c) => c.category === name)!.items
  assert.deepEqual(chips(BOM_40, "Main Processing Unit"), chips(BOM_46, "Main Processing Unit"))
  assert.deepEqual(chips(BOM_40, "Health Sensors (Candidate)"), chips(BOM_46, "Health Sensors (Candidate)"))
})
