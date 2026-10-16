export type Feasibility = "high" | "medium" | "experimental"

export interface Rev5Module {
  id: string
  label: string
  feasibility: Feasibility
  sizes: readonly ("NG46" | "NG40")[]
  purpose: string
  envelopeMm?: readonly [number, number, number]
  candidatePart?: string
  designRules: readonly string[]
}

export const WATCH_REV5_MODULES: readonly Rev5Module[] = [
  {
    id: "crown-generator",
    label: "Manual crown generator",
    feasibility: "high",
    sizes: ["NG46", "NG40"],
    purpose: "User-driven emergency energy input through a sealed crown/stem microgenerator.",
    envelopeMm: [8, 6, 5],
    candidatePart: "Custom magnet/coil microgenerator + rectifier",
    designRules: [
      "Must remain usable as SOS/cancel control.",
      "Energy output must be characterized at realistic hand-crank speeds.",
      "Must charge only the reserve storage path, never bypass battery protection.",
      "Crown sealing and cycle life require qualification.",
    ],
  },
  {
    id: "solar-ring",
    label: "Photovoltaic bezel/crystal ring",
    feasibility: "medium",
    sizes: ["NG46", "NG40"],
    purpose: "Supplemental light harvesting for reserve or battery-life extension.",
    candidatePart: "Custom segmented PV ring + ADP5091/ADP5092 MPPT harvester",
    designRules: [
      "Must not reduce display readability or antenna performance.",
      "Indoor and outdoor power must be measured independently.",
      "No claim that solar alone powers the watch.",
    ],
  },
  {
    id: "thermoelectric",
    label: "Thermoelectric case-back harvester",
    feasibility: "medium",
    sizes: ["NG46", "NG40"],
    purpose: "Harvest a small amount of energy from the skin-to-ambient temperature gradient.",
    candidatePart: "Thin custom TEG + ADP5091/ADP5092 low-voltage harvester",
    designRules: [
      "Must preserve optical sensor skin contact and thermal sensing accuracy.",
      "Must not thermally insulate the wearer enough to collapse the temperature gradient.",
      "Output is auxiliary only and requires on-wrist measurement.",
    ],
  },
  {
    id: "automatic-rotor",
    label: "Automatic self-winding electrical rotor",
    feasibility: "experimental",
    sizes: ["NG46", "NG40"],
    purpose: "Convert wrist motion through an oscillating mass and microgenerator into electrical energy.",
    candidatePart: "Custom annular/eccentric rotor + magnetic microgenerator",
    designRules: [
      "Prefer an annular/peripheral rotor so the central optical sensor and Qi coil remain usable.",
      "Must survive shock, sweat, and repeated bearing cycles without audible nuisance.",
      "NG40 packaging risk is substantially higher than NG46.",
      "Keep only if measured energy gain justifies added thickness, mass, and failure modes.",
    ],
  },
  {
    id: "reserve-storage",
    label: "Emergency energy reserve",
    feasibility: "high",
    sizes: ["NG46", "NG40"],
    purpose: "Dedicated supercapacitor reserve for the nRF5340 safety MCU, local alarm, and an emergency communication attempt.",
    candidatePart: "Low-profile supercapacitor TBD + LTC3331/harvester path",
    designRules: [
      "Reserve must be electrically isolated from the main OS load.",
      "Main processor/display must not be able to drain the safety reserve below its protected threshold.",
      "Capacity must be sized from measured SOS energy, not estimates.",
    ],
  },
  {
    id: "auto-injector-module",
    label: "Modular auto-injector research pod",
    feasibility: "experimental",
    sizes: ["NG46", "NG40"],
    purpose: "A physically separate, removable research pod for future clinically validated drug-delivery studies; the base watch remains functional without it.",
    candidatePart: "Drug-device combination-product research module (TBD)",
    designRules: [
      "Must remain mechanically and electrically isolated from the base watch until explicitly armed in a validated research workflow.",
      "Must use a separate service/replacement boundary so the watch can operate without the medication pod.",
      "Cartridge, delivery mechanism, dose, activation logic, and human-factors requirements are not finalized.",
      "No automatic drug-delivery claim until clinical, pharmaceutical, mechanical, regulatory, and human-factors validation is complete.",
      "The current watch does not inject naloxone and must not be relied on for treatment.",
    ],
  },
  {
    id: "camera",
    label: "Privacy-controlled camera",
    feasibility: "medium",
    sizes: ["NG46", "NG40"],
    purpose: "User-initiated still/video capture for calls, documentation, QR/barcode capture, or explicitly enabled emergency context.",
    candidatePart: "OMNIVISION OVM7692 CameraCubeChip-class MIPI module",
    envelopeMm: [6, 6, 4],
    designRules: [
      "Camera is off by default and never required for overdose detection.",
      "Mechanical shutter must physically block the lens.",
      "Camera sensor power must be hardware-gated.",
      "Privacy indicator LED must share the camera power rail so capture cannot occur with the indicator electrically off.",
      "No continuous background recording and no facial-recognition requirement.",
      "Images remain local unless the user explicitly sends or shares them.",
      "Lens window and shutter require separate ingress and drop validation.",
    ],
  },
] as const

export const REV5_POWER_ARCHITECTURE = {
  primaryStorage: "protected Li-ion battery",
  primaryCharging: "sealed Qi receiver",
  harvestingPmics: ["ADP5091/ADP5092 for PV/TEG", "LTC3331-class rectified magnetic/kinetic harvesting path"],
  reserve: "electrically isolated supercapacitor safety reserve",
  rule: "Harvesters extend reserve/runtime; none are represented as capable of continuously powering the full cellular Wear OS watch.",
} as const
