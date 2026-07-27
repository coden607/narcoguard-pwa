import assert from "node:assert/strict"
import { watchDesignCalculations, watchDesignModel } from "../lib/watch-design"

// This is a deterministic engineering-model regression check, not a substitute
// for CAD, enclosure testing, battery qualification, or sensor validation.
assert.equal(watchDesignCalculations.planarFootprintMm2, 2469)
assert.equal(watchDesignCalculations.planarFitMarginMm2, -1219)
assert.equal(watchDesignCalculations.idealizedRuntimeHours, 149)
assert.equal(watchDesignModel.waterResistance.status, "unverified")
assert.equal(watchDesignModel.waterResistance.sealedInterfaces.length, 6)
assert.ok(watchDesignModel.waterResistance.sealedInterfaces.every((item) => item.length > 0))
assert.ok(watchDesignModel.caseDiameterMm > 0)
assert.ok(watchDesignModel.caseThicknessMm > 0)

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
