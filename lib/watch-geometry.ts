import { watchDesignModel, watchDesignModel40, type WatchDesignModel } from "@/lib/watch-design"

// Concept geometry for the drawing and the 3D model, in millimetres. Axes: x toward 3 o'clock,
// y toward 12 o'clock, z up from the case back. Sizes come from the design model and from public
// package dimensions; positions are a proposed layout, not CAD, and the open issues below are real.

export interface Box {
  id: string
  label: string
  /** Callout id from WATCH_COMPONENTS, when the part has one. */
  callout?: string
  x: number
  y: number
  z: number
  w: number
  d: number
  h: number
  /** Hidden from the plan view (on the board underside or below the board). */
  hidden?: boolean
}

export interface Layer {
  id: string
  label: string
  z0: number
  z1: number
}

/** A numbered callout on the drawing: plan points are (x, y) mm or polar (degrees, radius mm); section points are (y, z) mm. */
export type PlanPoint = { x: number; y: number } | { deg: number; r: number }
export interface DrawingCallouts {
  plan: { id: string; anchor: PlanPoint; bubble: PlanPoint }[]
  section: { id: string; anchor: { y: number; z: number }; bubble: { y: number; z: number } }[]
}

interface Placement {
  x: number
  y: number
  /** Swap width and depth (connectivity is placed rotated on the 46 mm board). */
  rotate?: boolean
}

interface LayoutSpec {
  /** Round display diagonal in inches. */
  displayInches: number
  strapWidth: number
  crownRadius: number
  opticalWindowDiameter: number
  qiCoil: { inner: number; outer: number }
  sensorFlex: number
  soc: Placement
  connectivity: Placement
  mcu: Placement
  imu: Placement
  baro: Placement
  nfc: Placement
  openIssues: (geometry: { displayDiameter: number; clearance: number }) => string[]
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

export function buildWatchGeometry(model: WatchDesignModel, spec: LayoutSpec) {
  const designModule = (label: string) => {
    const found = [...model.placement].find((entry) => entry.label === label)
    if (!found) throw new Error(`Unknown design module ${label}`)
    return found
  }
  const caseRadius = model.caseDiameterMm / 2
  /** Radius of the usable internal area (for example 1250 mm² → about Ø39.9 mm). */
  const internalRadius = round(Math.sqrt(model.usableInternalPlanarAreaMm2 / Math.PI))
  const displayDiameter = Math.round(spec.displayInches * 25.4 * 10) / 10
  const clearance = model.interLayerClearanceMm
  const thickness = model.caseThicknessMm
  const [displayPlane, computePlane, batteryPlane] = model.coreLayers

  const soc = designModule("SoC + co-processor")
  const connectivity = designModule("Connectivity stack")
  const battery = designModule("Battery cell")
  const pod = model.medicationPod

  const caseBack = { id: "case-back", label: "Case back, optical window, Qi coil", z0: 0, z1: 1.4 }
  const batteryLayer = { id: "battery", label: "Battery plane", z0: caseBack.z1 + clearance, z1: caseBack.z1 + clearance + batteryPlane.maximumHeightMm }
  const computeLayer = { id: "compute", label: "Main board and components", z0: batteryLayer.z1 + clearance, z1: batteryLayer.z1 + clearance + computePlane.maximumHeightMm }
  const displayLayer = { id: "display", label: `Display module (Ø${displayDiameter} mm panel)`, z0: computeLayer.z1 + clearance, z1: computeLayer.z1 + clearance + displayPlane.maximumHeightMm }
  const crystal = { id: "crystal", label: "Sapphire crystal", z0: displayLayer.z1, z1: thickness }
  const LAYERS: Layer[] = [caseBack, batteryLayer, computeLayer, displayLayer, crystal].map((layer) => ({ ...layer, z0: round(layer.z0), z1: round(layer.z1) }))

  const layer = (id: string) => LAYERS.find((entry) => entry.id === id)!
  const pcbTop = round(layer("compute").z0 + 0.8)
  const lugScale = thickness / 13.8

  /** Lug and pod envelope; the medication pod sits in the 6 o'clock lug behind its own seal. */
  const ENVELOPE = {
    caseRadius,
    internalRadius,
    displayDiameter,
    caseThickness: thickness,
    strapWidth: spec.strapWidth,
    topLug: { y0: caseRadius - 2, y1: caseRadius + 6, z0: round(4 * lugScale), z1: round(11 * lugScale) },
    podLug: { y0: -(caseRadius + pod.module.heightMm + 2), y1: -(caseRadius - 2), z0: 0, z1: pod.targetMaximumHeightMm + 1 },
    crown: { x0: caseRadius - 0.5, x1: caseRadius + 4.5, radius: spec.crownRadius, z: round(7.5 * lugScale) },
    opticalWindowDiameter: spec.opticalWindowDiameter,
    qiCoil: spec.qiCoil,
  }

  const at = (placement: Placement, w: number, d: number) => ({ x: placement.x, y: placement.y, w: placement.rotate ? d : w, d: placement.rotate ? w : d })
  const PARTS: Box[] = [
    { id: "pcb", label: "Main board (HDI, 0.8 mm target)", x: 0, y: 0, z: layer("compute").z0, w: internalRadius * 2, d: internalRadius * 2, h: 0.8 },
    { id: "soc", label: "SoC + co-processor", callout: "snapdragon", z: pcbTop, h: 1.2, ...at(spec.soc, soc.widthMm, soc.heightMm) },
    { id: "connectivity", label: "Connectivity stack", callout: "cellular", z: pcbTop, h: 1.2, ...at(spec.connectivity, connectivity.widthMm, connectivity.heightMm) },
    { id: "mcu", label: "nRF5340 (aQFN94 7×7)", callout: "nordic", z: pcbTop, h: 0.9, ...at(spec.mcu, 7, 7) },
    { id: "imu", label: "LSM6DSO32X (LGA-14 2.5×3)", z: pcbTop, h: 0.86, ...at(spec.imu, 2.5, 3) },
    { id: "baro", label: "BMP390 (LGA-10 2×2)", z: pcbTop, h: 0.75, ...at(spec.baro, 2, 2) },
    { id: "nfc", label: "ST54K NFC controller", callout: "nfc", z: pcbTop, h: 0.6, ...at(spec.nfc, 4.5, 4.5) },
    { id: "emmc", label: "eMMC 32 GB (11.5×13), board underside", x: spec.soc.x, y: spec.soc.y, z: round(layer("compute").z0 - 0.6), w: 11.5, d: 13, h: 0.6, hidden: true },
    { id: "battery", label: `Battery ${battery.widthMm}×${battery.heightMm}×${batteryPlane.maximumHeightMm} mm`, callout: "battery", x: 0, y: 0, z: layer("battery").z0, w: battery.widthMm, d: battery.heightMm, h: batteryPlane.maximumHeightMm, hidden: true },
    { id: "sensor-flex", label: "Optical sensor flex (MAX86178, LEDs, photodiodes)", callout: "ppg-ecg", x: 0, y: 0, z: round(layer("case-back").z1 - 0.5), w: spec.sensorFlex, d: spec.sensorFlex, h: 0.5, hidden: true },
    { id: "pod", label: `Medication pod ${pod.module.widthMm}×${pod.module.heightMm}×${pod.targetMaximumHeightMm} mm (research)`, callout: "naloxone", x: 0, y: -(caseRadius + pod.module.heightMm / 2 - 1), z: 0.5, w: pod.module.widthMm, d: pod.module.heightMm, h: pod.targetMaximumHeightMm },
  ]

  const ANTENNAS = [
    { id: "gnss", label: "GNSS/satellite LDS antenna", callout: "gps", from: 55, to: 125 },
    { id: "cellular", label: "Cellular LDS antenna", callout: "cellular", from: 215, to: 325 },
    { id: "nfc", label: "NFC loop", callout: "nfc", from: 150, to: 205 },
  ] as const

  const part = (id: string) => PARTS.find((entry) => entry.id === id)!
  const mid = (box: Box) => round(box.z + box.h / 2)
  const above = round(thickness + 5.2)
  const below = -8
  const outer = caseRadius + 13
  const socBox = part("soc")
  const connectivityBox = part("connectivity")
  const mcuBox = part("mcu")
  const nfcBox = part("nfc")
  const batteryBox = part("battery")
  const podBox = part("pod")
  const display = layer("display")
  const coilMid = -(spec.qiCoil.inner + spec.qiCoil.outer) / 4
  const CALLOUTS: DrawingCallouts = {
    plan: [
      { id: "snapdragon", anchor: { x: socBox.x - 3.5, y: socBox.y + 4 }, bubble: { deg: 152, r: outer } },
      { id: "nordic", anchor: { x: mcuBox.x, y: mcuBox.y + 1 }, bubble: { deg: 112, r: outer } },
      { id: "gps", anchor: { deg: 70, r: internalRadius + 1.55 }, bubble: { deg: 62, r: outer } },
      { id: "cellular", anchor: { x: connectivityBox.x + 2, y: connectivityBox.y + 4 }, bubble: { deg: 24, r: outer } },
      { id: "crown", anchor: { x: caseRadius + 3, y: -1 }, bubble: { deg: -12, r: outer } },
      { id: "battery", anchor: { x: batteryBox.w / 2 - 2, y: -batteryBox.d / 2 }, bubble: { deg: -48, r: outer } },
      { id: "naloxone", anchor: { x: 5, y: podBox.y - 2 }, bubble: { deg: -42, r: caseRadius + 22 } },
      { id: "nfc", anchor: { x: nfcBox.x, y: nfcBox.y - 0.5 }, bubble: { deg: -128, r: outer } },
    ],
    section: [
      { id: "display", anchor: { y: -displayDiameter / 3, z: round((display.z0 + display.z1) / 2) }, bubble: { y: -displayDiameter / 3, z: above } },
      { id: "ppg-ecg", anchor: { y: 4, z: mid(part("sensor-flex")) }, bubble: { y: 4, z: below } },
      { id: "sealed-charge", anchor: { y: coilMid, z: 0.75 }, bubble: { y: coilMid, z: below } },
      { id: "snapdragon", anchor: { y: socBox.y - 1, z: mid(socBox) }, bubble: { y: socBox.y + 3, z: above } },
      { id: "battery", anchor: { y: batteryBox.d / 2 - 3, z: mid(batteryBox) }, bubble: { y: batteryBox.d / 2 + 1, z: above } },
      { id: "naloxone", anchor: { y: podBox.y, z: mid(podBox) }, bubble: { y: podBox.y, z: above } },
    ],
  }

  return {
    model,
    LAYERS,
    ENVELOPE,
    PARTS,
    ANTENNAS,
    CALLOUTS,
    OPEN_ISSUES: spec.openIssues({ displayDiameter, clearance }),
  }
}

export type WatchGeometry = ReturnType<typeof buildWatchGeometry>

export const GEOMETRY_46 = buildWatchGeometry(watchDesignModel, {
  displayInches: 1.45,
  strapWidth: 22,
  crownRadius: 2.6,
  opticalWindowDiameter: 12,
  qiCoil: { inner: 18, outer: 30 },
  sensorFlex: 16,
  soc: { x: -5.5, y: -1 },
  connectivity: { x: 11, y: 0, rotate: true },
  mcu: { x: -3, y: 12 },
  imu: { x: 5, y: -13 },
  baro: { x: 9, y: -12 },
  nfc: { x: -6, y: -14.5 },
  openIssues: ({ displayDiameter, clearance }) => [
    `Display envelope: a 1.45" round panel is Ø${displayDiameter} mm, but the planar model still budgets 31×31 mm. Reconcile in CAD.`,
    "Planar budget is over-allocated in the design model (see the sealed-core fit check); the layout above stacks modules to fit.",
    `The eMMC sits under the board in the ${clearance} mm battery clearance; package height and swelling allowance need verification.`,
    "Medication pod is a separate sealed lug module; actuator, needle path and drug stability are unspecified research items.",
    "Antenna keep-outs, thermal paths and drop/ingress performance are not yet simulated.",
  ],
})

/** NG 40 mm: the same parts on a smaller board. The SoC sits 0.04 mm inside the board edge, so CAD must confirm it. */
export const GEOMETRY_40 = buildWatchGeometry(watchDesignModel40, {
  displayInches: 1.2,
  strapWidth: 20,
  crownRadius: 2.3,
  opticalWindowDiameter: 10,
  qiCoil: { inner: 15, outer: 25 },
  sensorFlex: 14,
  soc: { x: -5.5, y: 0 },
  connectivity: { x: 10, y: 0 },
  mcu: { x: 0, y: 13 },
  imu: { x: 5, y: -12 },
  baro: { x: 9, y: -11 },
  nfc: { x: -1, y: -11.75 },
  openIssues: ({ displayDiameter, clearance }) => [
    `Display envelope: a 1.2" round panel is Ø${displayDiameter} mm against a 27×27 mm planar budget; reconcile in CAD.`,
    "The connectivity stack is budgeted at 12×12 mm (16×14 on the 46 mm) as a compact RF module target; if no vendor confirms it, the board must go double-sided.",
    `The SoC corner sits within 0.05 mm of the Ø34.2 board edge, and the eMMC sits in the ${clearance} mm battery clearance; both need CAD and tolerance checks.`,
    "Same medication pod as the 46 mm (the dose volume does not shrink); it sits in a 20 mm lug and remains research only.",
    "A 0.8 mm crystal, smaller antennas and a 300 mAh cell need drop, RF and runtime testing before any claim.",
  ],
})

// The 46 mm geometry keeps its original names for existing callers.
export const LAYERS = GEOMETRY_46.LAYERS
export const ENVELOPE = GEOMETRY_46.ENVELOPE
export const PARTS: readonly Box[] = GEOMETRY_46.PARTS
export const ANTENNAS = GEOMETRY_46.ANTENNAS
export const OPEN_ISSUES = GEOMETRY_46.OPEN_ISSUES

/** Parts that intrude past the internal radius in plan, which a real layout must not allow. */
export function planInterferences(parts: readonly Box[] = PARTS, radius = ENVELOPE.internalRadius) {
  return parts
    .filter((part) => part.id !== "pcb" && part.id !== "pod")
    .filter((part) => {
      const corners = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sy]) => Math.hypot(part.x + (sx * part.w) / 2, part.y + (sy * part.d) / 2))
      return Math.max(...corners) > radius + 1e-9
    })
    .map((part) => part.id)
}
