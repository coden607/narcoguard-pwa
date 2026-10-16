# Rev 5 component geometry provenance

This file separates **manufacturer-backed package dimensions** from **design envelopes** that still require supplier CAD.

## Manufacturer-backed package dimensions

| Part | Package envelope used in CAD | Source status |
| --- | --- | --- |
| Nordic nRF5340 | 7.00 × 7.00 × 0.85 mm, aQFN94 | Manufacturer mechanical specification |
| ST LSM6DSO32X | 2.50 × 3.00 × 0.86 mm | Manufacturer product page / datasheet |
| Bosch BMP390 | 2.00 × 2.00 × 0.75 mm | Manufacturer product page |
| Analog Devices MAX86178 | 2.77 × 2.57 mm plan envelope; 0.60 mm conservative CAD height pending package-file import | Manufacturer product page confirms WLP plan dimensions and links CAD resources |
| Melexis MLX90632 | 3.00 × 3.00 × 1.00 mm | Manufacturer product page / datasheet; Melexis also publishes package 3D models |

Reference pages:
- Nordic nRF5340 mechanical specifications: https://docs.nordicsemi.com/r/bundle/ps_nrf5340/page/chapters/mec_spec.html
- ST LSM6DSO32X: https://www.st.com/en/mems-and-sensors/lsm6dso32x.html
- Bosch BMP390: https://www.bosch-sensortec.com/en/products/environmental-sensors/pressure-sensors/bmp390
- Analog Devices MAX86178: https://www.analog.com/en/products/max86178.html
- Melexis MLX90632: https://www.melexis.com/en/product/MLX90632
- Melexis package 3D models: https://www.melexis.com/en/documents/documentation/packages/package-3d-models

## Still design envelopes — do not treat as supplier mechanical CAD

| Part / subsystem | Current envelope | Why still provisional |
| --- | --- | --- |
| Snapdragon W5+ Gen 2 wearable platform | 18 × 18 × 1.1 mm design envelope | Public exact package mechanical CAD is not established in this repo; Qualcomm customer documentation may be required |
| Snapdragon X35 / SDX35 RF integration | 16 × 14 × 1.0 mm NG46; 12 × 12 × 1.0 mm NG40 design target | Modem/RF module implementation depends on Qualcomm reference design, packaging, PMIC/RF front-end and carrier-certified integration |
| ST54K NFC / secure element | 4.5 × 4.5 × 0.7 mm design envelope | Exact selected orderable package/CAD must be locked before DFM |
| 32 GB eMMC | 11.5 × 13 × 0.7 mm design envelope | Vendor/package not yet selected |
| Camera | 6 × 6 × 3.6 mm NG46; 5.2 × 5.2 × 3.2 mm NG40 | Exact sensor/lens/shutter module not selected |
| Display | Ø36.8 mm NG46; Ø30.5 mm NG40 | Exact supplier module, flex tail and touch stack not selected |
| Batteries | 28 × 22 × 5 mm NG46; 24 × 19 × 4.2 mm NG40 | Custom cell quotes, protection board, swelling and certification data required |
| Crown generator | custom envelope | Requires mechanical generator prototype and torque/output test |
| Automatic rotor | annular research envelope | Requires rotor, bearing, shock and energy-return design |
| TEG / solar ring | research envelopes | Requires selected vendor devices and measured energy output |

## Rule

No design-envelope row above may be relabeled “verified,” “production-ready,” or “fits” based solely on the current CAD.

The next DFM gate is to replace every provisional block with the selected vendor STEP/IGES model, then rerun:
1. board-edge checks;
2. pairwise interference;
3. z-stack/tolerance analysis;
4. flex and connector routing;
5. battery swelling clearance;
6. gasket compression and fastener clearance;
7. antenna keep-outs;
8. thermal-path checks.
