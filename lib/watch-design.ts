export type WatchDesignModule = {
  label: string
  widthMm: number
  heightMm: number
}

export type WatchDesignLayer = {
  label: string
  modules: readonly WatchDesignModule[]
  maximumHeightMm: number
}

export const watchDesignModel = {
  caseDiameterMm: 46,
  caseThicknessMm: 13.8,
  usableInternalPlanarAreaMm2: 1250,
  nominalBatteryCapacityMah: 500,
  nominalBatteryVoltage: 3.7,
  sensorMonitoringPowerMw: 12.4,
  placement: [
    { label: "SoC + co-processor", widthMm: 18, heightMm: 18 },
    { label: "Display module", widthMm: 31, heightMm: 31 },
    { label: "Battery cell", widthMm: 28, heightMm: 22 },
    { label: "Medication module", widthMm: 18, heightMm: 12 },
    { label: "Connectivity stack", widthMm: 16, heightMm: 14 },
    { label: "Sensor ring", widthMm: 32, heightMm: 4 },
  ] satisfies WatchDesignModule[],
  coreLayers: [
    {
      label: "Display and optical sensor plane",
      modules: [
        { label: "Display module", widthMm: 31, heightMm: 31 },
        { label: "Sensor ring", widthMm: 32, heightMm: 4 },
      ],
      maximumHeightMm: 2,
    },
    {
      label: "Compute and connectivity plane",
      modules: [
        { label: "SoC + co-processor", widthMm: 18, heightMm: 18 },
        { label: "Connectivity stack", widthMm: 16, heightMm: 14 },
      ],
      maximumHeightMm: 2,
    },
    {
      label: "Battery plane",
      modules: [{ label: "Battery cell", widthMm: 28, heightMm: 22 }],
      maximumHeightMm: 5,
    },
  ] satisfies WatchDesignLayer[],
  medicationPod: {
    module: { label: "Medication pod", widthMm: 18, heightMm: 12 },
    targetMaximumHeightMm: 10,
    separatePressureBoundary: true,
    underwaterDeployment: false,
  },
  interLayerClearanceMm: 0.6,
  waterResistance: {
    target: "IP68 enclosure + ISO 22810 water-resistant watch qualification",
    status: "unverified" as const,
    sealedInterfaces: [
      "case-back perimeter",
      "crystal and crown interfaces",
      "sealed Qi charging boundary",
      "bonded sensor windows",
      "membrane-protected acoustic ports",
      "controlled service/cartridge boundary",
    ],
  },
} as const

/**
 * NG 40 mm, sized for smaller wrists (often chosen by women; anyone can wear either size). Same
 * electronics and safety functions as the 46 mm; smaller case, display, battery and a compact RF
 * module target. Values are design targets, not measurements.
 */
export const watchDesignModel40 = {
  caseDiameterMm: 40,
  caseThicknessMm: 12.2,
  usableInternalPlanarAreaMm2: 920,
  nominalBatteryCapacityMah: 300,
  nominalBatteryVoltage: 3.7,
  sensorMonitoringPowerMw: 12.4,
  placement: [
    { label: "SoC + co-processor", widthMm: 18, heightMm: 18 },
    { label: "Display module", widthMm: 27, heightMm: 27 },
    { label: "Battery cell", widthMm: 24, heightMm: 19 },
    { label: "Medication module", widthMm: 18, heightMm: 12 },
    { label: "Connectivity stack", widthMm: 12, heightMm: 12 },
    { label: "Sensor ring", widthMm: 28, heightMm: 4 },
  ] satisfies WatchDesignModule[],
  coreLayers: [
    {
      label: "Display and optical sensor plane",
      modules: [
        { label: "Display module", widthMm: 27, heightMm: 27 },
        { label: "Sensor ring", widthMm: 28, heightMm: 4 },
      ],
      maximumHeightMm: 2,
    },
    {
      label: "Compute and connectivity plane",
      modules: [
        { label: "SoC + co-processor", widthMm: 18, heightMm: 18 },
        { label: "Connectivity stack", widthMm: 12, heightMm: 12 },
      ],
      maximumHeightMm: 2,
    },
    {
      label: "Battery plane",
      modules: [{ label: "Battery cell", widthMm: 24, heightMm: 19 }],
      maximumHeightMm: 4.2,
    },
  ] satisfies WatchDesignLayer[],
  medicationPod: {
    module: { label: "Medication pod", widthMm: 18, heightMm: 12 },
    targetMaximumHeightMm: 10,
    separatePressureBoundary: true,
    underwaterDeployment: false,
  },
  interLayerClearanceMm: 0.6,
  waterResistance: {
    target: "IP68 enclosure + ISO 22810 water-resistant watch qualification",
    status: "unverified" as const,
    sealedInterfaces: [
      "case-back perimeter",
      "crystal and crown interfaces",
      "sealed Qi charging boundary",
      "bonded sensor windows",
      "membrane-protected acoustic ports",
      "controlled service/cartridge boundary",
    ],
  },
} as const

export function calculatePlanarFootprint(modules: readonly WatchDesignModule[]) {
  return modules.reduce((sum, module) => sum + module.widthMm * module.heightMm, 0)
}

export function calculateIdealizedRuntimeHours(capacityMah: number, voltage: number, loadMw: number) {
  if (capacityMah <= 0 || voltage <= 0 || loadMw <= 0) return 0
  return Math.round((capacityMah * voltage) / loadMw)
}
export function calculateLayerFootprint(layer: WatchDesignLayer) {
  return calculatePlanarFootprint(layer.modules)
}


export type WatchDesignModel = typeof watchDesignModel | typeof watchDesignModel40

export function calculateWatchDesign(model: WatchDesignModel) {
  const coreStackHeightMm =
    model.coreLayers.reduce((sum, layer) => sum + layer.maximumHeightMm, 0) +
    (model.coreLayers.length - 1) * model.interLayerClearanceMm
  return {
    planarFootprintMm2: calculatePlanarFootprint(model.placement),
    planarFitMarginMm2: model.usableInternalPlanarAreaMm2 - calculatePlanarFootprint(model.placement),
    idealizedRuntimeHours: calculateIdealizedRuntimeHours(model.nominalBatteryCapacityMah, model.nominalBatteryVoltage, model.sensorMonitoringPowerMw),
    coreLayerFootprintsMm2: model.coreLayers.map(calculateLayerFootprint),
    coreLayerMarginsMm2: model.coreLayers.map((layer) => model.usableInternalPlanarAreaMm2 - calculateLayerFootprint(layer)),
    coreStackHeightMm: Number(coreStackHeightMm.toFixed(2)),
    coreThicknessMarginMm: Number((model.caseThicknessMm - coreStackHeightMm).toFixed(2)),
    medicationPodFootprintMm2: calculatePlanarFootprint([model.medicationPod.module]),
  }
}

export const watchDesignCalculations = calculateWatchDesign(watchDesignModel)
export const watchDesignCalculations40 = calculateWatchDesign(watchDesignModel40)
