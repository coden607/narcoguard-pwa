# NarcoGuard wearable concept: BOM and validation notes

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

## Revised physical architecture

The original all-in-one planar sum is not a valid manufacturable layout: it totals 2,469 mm² against a 1,250 mm² single-plane allowance. The revised concept separates the sealed watch core from the medication pod:

- Display/optical plane: 1,089 mm² modeled footprint, 2 mm maximum target height.
- Compute/connectivity plane: 548 mm² modeled footprint, 2 mm maximum target height.
- Battery plane: 616 mm² modeled footprint, 5 mm maximum target height.
- Inter-layer clearance assumption: 0.6 mm; modeled core stack: 10.2 mm inside the 13.8 mm case target, leaving 3.6 mm before real gasket, flex, fastener, and tolerance data.
- Medication pod: 216 mm² modeled footprint, up to 10 mm target height, mechanically separate with its own pressure boundary. It is not part of the sealed watch-core stack and is not permitted to deploy underwater.

These are feasibility calculations, not CAD evidence. The core remains conditional until a tolerance-aware 3D CAD assembly demonstrates clearances, heat paths, flex routing, antenna keep-outs, seal compression, and service access.

## Water-resistance requirement

Water resistance is a required design constraint, not a current product claim. The target is an IP68 enclosure qualification under [IEC 60529](https://webstore.iec.ch/en/publication/2453) together with water-resistant-watch qualification under [ISO 22810:2010](https://www.iso.org/standard/45334.html). The applicable standards define the test methods and marking requirements; a rendered blueprint or gasket specification cannot substitute for those tests.

The enclosure concept must use a continuous case-back seal, controlled crystal and crown interfaces, sealed service connectors, a sealed charging strategy, protected sensor windows, and a cartridge bay that cannot compromise the pressure boundary. The medication module must be mechanically locked out during water exposure and must not be represented as safe to deploy underwater.

Required prototype evidence:

- dimensional inspection and gasket compression/tolerance stack-up;
- pressure, immersion, thermal-cycle, sweat/chemical, and condensation testing on assembled units;
- leak detection before and after drop, button, charging, and cartridge-service cycling;
- post-test battery isolation, charging safety, radio operation, display, sensor optical path, and alarm checks;
- independent qualification and controlled production sampling before any water-resistance marking.

Current status: unverified. The repository has no physical enclosure, CAD interference model, or laboratory test report.

## Current diagrams

The public concept page includes these illustrative assets: `ng-blueprint.jpg`, `ng-blueprint-detailed.jpg`, `ng-exploded-view.jpg`, and `ng-modular-exploded.jpg`. They communicate intended placement and modular boundaries only; dimensions, tolerances, fastener specifications, material selection and actuator safety margins still require CAD and prototype verification.

## Simulation status

The repository now has a deterministic regression test for Kalman filtering, confidence-weighted fusion, normal readings, sustained multi-signal deterioration and escalation gating. This verifies software behavior only. It cannot establish sensor accuracy, overdose detection sensitivity/specificity, safe medication delivery, or clinical efficacy.

Before a physical prototype is considered, the engineering review must add CAD interference checks, tolerance stack-up, battery/thermal analysis, ingress and drop models, sensor test fixtures, calibration data, fault-injection tests, and an independent clinical/regulatory review.

## Authoritative component references

These links are manufacturer or standards-body sources used to bound the candidate claims; they do not constitute system validation:

- [Qualcomm Snapdragon W5+ product brief](https://www.qualcomm.com/content/dam/qcomm-martech/dm-assets/documents/Snapdragon-W5-Plus-Gen-1-Wearable-Platforms-product-brief.pdf) — platform architecture and supported cellular/GNSS options.
- [Analog Devices MAX86178](https://www.analog.com/en/products/max86178.html) — PPG, ECG, and BioZ AFE capabilities.
- [Texas Instruments BQ25619](https://www.ti.com/product/BQ25619) — single-cell, single-input charger/power-path constraints.
- [Texas Instruments BQ51013B](https://www.ti.com/lit/ds/symlink/bq51013b.pdf) — Qi receiver constraints.
- [Nordic nRF5340 product specification](https://docs.nordicsemi.com/r/bundle/ps_nrf5340/page/keyfeatures_html5.html) — MCU supply, package, and operating limits.
- [Bosch BMP390](https://www.bosch-sensortec.com/en/products/environmental-sensors/pressure-sensors/pressure-sensors-bmp390.html), [ST LSM6DSO32X](https://www.st.com/en/mems-and-sensors/lsm6dso32x.html), and [Melexis MLX90632](https://www.melexis.com/en/product/MLX90632/Miniature-SMD-Infrared-Thermometer-IC) — candidate environmental, motion, and temperature-sensor limits.

Supplier availability, package variants, PCB stack-up, antenna matching, battery certification, sealing, and all medical performance remain open verification items.
