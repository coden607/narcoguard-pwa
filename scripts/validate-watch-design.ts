import assert from "node:assert/strict"
import { watchDesignCalculations, watchDesignCalculations40, watchDesignModel, watchDesignModel40 } from "../lib/watch-design"

// This is a deterministic engineering-model regression check, not a substitute
// for CAD, enclosure testing, battery qualification, or sensor validation.
assert.equal(watchDesignCalculations.planarFootprintMm2, 2469)
assert.equal(watchDesignCalculations.planarFitMarginMm2, -1219)
assert.equal(watchDesignCalculations.idealizedRuntimeHours, 149)
assert.deepEqual(watchDesignCalculations.coreLayerFootprintsMm2, [1089, 548, 616])
assert.deepEqual(watchDesignCalculations.coreLayerMarginsMm2, [161, 702, 634])
assert.equal(watchDesignCalculations.coreStackHeightMm, 10.2)
assert.equal(watchDesignCalculations.coreThicknessMarginMm, 3.6)
assert.equal(watchDesignCalculations.medicationPodFootprintMm2, 216)
assert.equal(watchDesignModel.medicationPod.separatePressureBoundary, true)
assert.equal(watchDesignModel.medicationPod.underwaterDeployment, false)
assert.equal(watchDesignModel.waterResistance.status, "unverified")
assert.equal(watchDesignModel.waterResistance.sealedInterfaces.length, 6)
assert.ok(watchDesignModel.waterResistance.sealedInterfaces.every((item) => item.length > 0))
assert.ok(watchDesignModel.caseDiameterMm > 0)
assert.ok(watchDesignModel.caseThicknessMm > 0)

// NG 40 mm (women's fit): smaller case and cell, same pod and water-resistance rules.
assert.deepEqual(watchDesignCalculations40.coreLayerFootprintsMm2, [841, 468, 456])
assert.ok(watchDesignCalculations40.coreLayerMarginsMm2.every((margin) => margin > 0))
assert.equal(watchDesignCalculations40.coreStackHeightMm, 9.4)
assert.equal(watchDesignCalculations40.coreThicknessMarginMm, 2.8)
assert.equal(watchDesignCalculations40.idealizedRuntimeHours, 90)
assert.equal(watchDesignModel40.medicationPod.underwaterDeployment, false)
assert.equal(watchDesignModel40.waterResistance.status, "unverified")

console.log(
  JSON.stringify(
    {
      status: "model-consistent; physical-fit-and-water-resistance-verification-pending",
      planarFootprintMm2: watchDesignCalculations.planarFootprintMm2,
      planarAllowanceMm2: watchDesignModel.usableInternalPlanarAreaMm2,
      planarFitMarginMm2: watchDesignCalculations.planarFitMarginMm2,
      idealizedRuntimeHours: watchDesignCalculations.idealizedRuntimeHours,
      waterResistanceTarget: watchDesignModel.waterResistance.target,
    },
    null,
    2,
  ),
)
