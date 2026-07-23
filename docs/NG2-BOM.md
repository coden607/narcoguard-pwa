# NG2 wearable concept: BOM and validation notes

This document describes the current engineering concept. It is not a manufacturing drawing, medical-device specification, or evidence that the hardware can safely administer medication.

## Modular bill of materials

| Module | Function | Replaceable boundary | Pre-prototype validation required |
| --- | --- | --- | --- |
| Enclosure and strap | Protects electronics and holds the watch on the wrist | Screws/clips; strap is independent | Ergonomics, ingress protection, skin contact, impact and heat testing |
| Main compute board | Runs firmware, signal conditioning, logging and communications | Board-to-board connector | Power budget, thermal envelope, watchdog and fault recovery |
| PPG/ECG sensor assembly | Optical/electrical pulse measurements | Sensor flex/connector | Motion artefact, skin-tone, placement and calibration study |
| Pulse-oximeter assembly | Estimates oxygen saturation | Sensor flex/connector | FDA/IEC-appropriate validation and calibration; not validated by this app |
| Motion/IMU assembly | Motion and respiration-related proxy signal | Sensor module/connector | Orientation, vibration and false-positive characterization |
| Temperature sensor | Skin-temperature trend input | Sensor module/connector | Thermal lag and ambient-temperature characterization |
| Battery, protection and charger | Energy storage and safe charging | Battery pack and protected connector | Capacity, abuse, short-circuit, charging and transport testing |
| Radio module | Bluetooth/Wi-Fi/cellular communication | Certified module connector | RF, privacy, pairing and loss-of-network behavior |
| Alert/user interface | Haptic, display and audible feedback | UI board/module | Accessibility, alarm acknowledgement and fail-safe behavior |
| Medication-delivery mechanism | Future research module only | Isolated cartridge/actuator bay | Independent clinical, mechanical, regulatory and human-factors program before any use |

## Placement assumptions

- Optical sensors contact the underside of the wrist with controlled pressure and a light shield.
- The IMU is close to the enclosure centroid to reduce rotational coupling.
- The battery and radio remain separated from analog sensor traces as far as the enclosure permits.
- The cartridge/actuator bay is mechanically isolated from the sensing board and must have a physical service lockout.
- Every module needs a keyed connector, strain relief, polarity protection and a documented replacement procedure.

## Current diagrams

The public concept page includes these illustrative assets: `ng2-blueprint.jpg`, `ng2-blueprint-detailed.jpg`, `ng2-exploded-view.jpg`, and `ng2-modular-exploded.jpg`. They communicate intended placement and modular boundaries only; dimensions, tolerances, fastener specifications, material selection and actuator safety margins still require CAD and prototype verification.

## Simulation status

The repository now has a deterministic regression test for Kalman filtering, confidence-weighted fusion, normal readings, sustained multi-signal deterioration and escalation gating. This verifies software behavior only. It cannot establish sensor accuracy, overdose detection sensitivity/specificity, safe medication delivery, or clinical efficacy.

Before a physical prototype is considered, the engineering review must add CAD interference checks, tolerance stack-up, battery/thermal analysis, ingress and drop models, sensor test fixtures, calibration data, fault-injection tests, and an independent clinical/regulatory review.
