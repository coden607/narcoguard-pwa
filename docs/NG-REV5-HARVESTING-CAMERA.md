# NarcoGuard NG Rev 5 — Energy Harvesting + Camera Addendum

Status: research hardware concept. These additions are not manufacturing-ready and do not change the current non-medical-device status.

## Design decision

Rev 5 keeps the protected Li-ion battery and sealed Qi charging as the primary power system. Harvesting is supplemental. The objective is to extend reserve/runtime and create an emergency-energy path, not to claim a self-powered watch.

### Power path

```text
PV bezel/crystal ring ─────┐
Thermoelectric case back ──┼──> low-voltage MPPT harvester ─┐
Manual crown generator ────┤                                │
Automatic rotor generator ─┘--> rectification/harvester ────┼──> reserve supercapacitor
                                                            │
Qi receiver ───────────────────────> main charger/power path ┼──> protected Li-ion battery
                                                            │
                                                            └──> nRF5340 safety rail / SOS reserve
```

The reserve rail is intentionally separate from the Snapdragon/display load. Its capacity must be sized from measured SOS energy.

## 1. Manual crown generator — priority addition

Feasibility: HIGH for research prototyping.

Architecture:
- sealed crown and stem;
- miniature permanent magnet/coil generator or micro-dynamo coupled to crown rotation;
- low-loss rectification;
- energy-harvesting PMIC;
- reserve supercapacitor;
- protected transfer to the battery only when electrically safe.

Target envelope reserved for early packaging work: approximately 8 × 6 × 5 mm, subject to real mechanical design.

Requirements:
- crown continues to provide manual SOS/cancel interaction;
- no direct electrical bypass around battery protection;
- tactile effort remains reasonable;
- generator must be characterized at realistic human rotation speed and torque;
- crown seal, shaft, bearings/gearing and cycle life require qualification;
- harvested-energy UI must report measured energy, not optimistic estimates.

Primary use case: restore or preserve enough safety-rail energy for the nRF5340, haptic/audible alarm, and potentially one emergency communication attempt after the main battery is critically low.

## 2. Automatic self-winding electrical rotor

Feasibility: EXPERIMENTAL.

This is an electrical analogue of an automatic mechanical watch. An eccentric or annular oscillating mass moves with the wrist and drives a microgenerator.

Preferred packaging concept:
- peripheral/annular rotor rather than a large central rotor;
- preserve the central optical sensor window;
- preserve the Qi coil and case-back sensor contact;
- mechanical stop and shock protection;
- sealed bearing system.

NG 46 is the more credible packaging target. NG 40 is substantially harder because the smaller case already has tight PCB, battery and RF constraints.

Keep this feature only if bench tests demonstrate a useful energy return relative to:
- added thickness;
- added mass;
- bearing wear;
- acoustic noise;
- impact resistance;
- sealing complexity.

## 3. Solar harvesting

Feasibility: MEDIUM.

Use a segmented photovoltaic ring around the display/bezel or another optically exposed non-RF-critical surface.

Power management candidate:
- Analog Devices ADP5091/ADP5092-class ultralow-power MPPT energy harvester.

Rules:
- supplemental only;
- no “solar powered” or perpetual-power claim;
- separate indoor/outdoor characterization;
- preserve display visibility;
- preserve cellular/GNSS antenna keep-outs;
- test thermal effects under strong sunlight.

## 4. Thermoelectric body-heat harvesting

Feasibility: MEDIUM.

A thin thermoelectric generator can use the temperature difference between the skin-facing case and the ambient-facing enclosure.

Power management candidate:
- ADP5091/ADP5092-class low-voltage harvester.

Mechanical rules:
- do not obstruct MAX86178 optical/electrical sensor contact;
- maintain thermal path to ambient;
- do not invalidate the MLX90632 temperature measurement;
- do not add uncomfortable hot/cold spots;
- measure real output on-wrist across ambient conditions.

Output is auxiliary only.

## 5. Emergency reserve

Feasibility: HIGH.

Add a dedicated low-profile supercapacitor or equivalent high-cycle reserve element.

Reserved loads:
1. nRF5340 safety MCU;
2. local haptic/alarm;
3. minimal emergency status indication;
4. one emergency radio transaction if the measured energy budget permits.

The Snapdragon/display must not be allowed to exhaust this reserve.

Candidate harvesting interface for rectified magnetic/kinetic sources:
- Analog Devices LTC3331-class nanopower harvesting/battery-backup architecture.

Exact capacitor chemistry, voltage, ESR and capacity remain TBD until the SOS energy profile is measured.

## 6. Camera

Feasibility: MEDIUM.

Candidate class:
- OMNIVISION CameraCubeChip miniature wafer-level camera;
- OVM7692-class MIPI module is a concrete low-power/small-form-factor reference candidate.

The camera is NOT part of overdose detection and is not an always-on sensor.

### Intended functions

- user-started photo/video;
- video calls;
- QR/barcode/document capture;
- optional user-triggered emergency context sharing;
- remote support when explicitly initiated.

### Mandatory privacy architecture

1. Camera OFF by default.
2. Dedicated hardware power gate to the image sensor.
3. Mechanical shutter that physically blocks the lens.
4. Privacy LED electrically tied to the camera-power rail so software cannot intentionally capture while leaving the indicator unpowered.
5. No default continuous/background recording.
6. No facial-recognition requirement.
7. Captures stay local unless the wearer explicitly chooses to send/share them.
8. Camera permission is independently revocable.
9. Emergency workflows must still function with the camera disabled or shuttered.

### Mechanical placement

Preferred locations to investigate:
- upper case edge around 12 o’clock, angled slightly outward; or
- protected crown-side aperture if the crown/generator stack leaves adequate separation.

Avoid the wrist-facing case back.

Early camera envelope reservation: approximately 6 × 6 × 4 mm including lens/shutter space; final module dimensions must come from a selected supplier package.

The aperture requires:
- sapphire or hardened optical cover;
- gasket/seal;
- black internal baffle;
- mechanical shutter;
- impact protection;
- condensation testing.

## NG 46 vs NG 40

| Rev 5 feature | NG 46 | NG 40 |
| --- | --- | --- |
| Crown generator | Priority prototype | Priority prototype, smaller mechanism |
| Solar ring | Feasible research target | Feasible but less collecting area |
| Thermoelectric | Feasible research target | Feasible but less area/thermal gradient |
| Automatic rotor | Best candidate size | Experimental/high packaging risk |
| Safety supercapacitor | Required Rev 5 target | Required Rev 5 target |
| Camera | Medium feasibility | Medium/high packaging risk |
| Qi | Remains primary charging | Remains primary charging |
| Li-ion | 500 mAh target | 300 mAh target |

## Validation gates before calling any harvester useful

For each source, measure:
- open-circuit voltage;
- loaded voltage/current;
- average and peak harvested power;
- conversion efficiency through the PMIC;
- energy per hour of realistic wear;
- energy added to reserve/battery;
- effect on RF, sensor quality and skin temperature;
- effect on thickness, weight, noise and comfort.

The design should automatically drop any harvester whose measured benefit does not justify its packaging and reliability cost.

## Current truth boundary

These Rev 5 additions are now part of the engineering concept, but none has yet been physically built or measured. The next credible hardware step is a tolerance-aware CAD assembly followed by benchtop harvester prototypes and a camera/privacy-shutter mockup.
