# Vendor compute/RF module interface requirements

The carrier-board architecture intentionally isolates production routing that depends on Qualcomm-controlled/reference-design information.

## Required vendor inputs before electrical release

- exact W5+ Gen 2 package/SKU and pin map;
- PMIC/reference power tree and sequencing;
- LPDDR/eMMC reference topology, length/skew/termination rules;
- X35/SDX35 package/module implementation choice;
- approved RF front-end and antenna feed topology;
- GNSS/cellular/Wi-Fi coexistence requirements;
- reference ground/return strategy and placement keep-outs;
- controlled-impedance classes and stackup assumptions;
- carrier/certification constraints relevant to the final modem integration.

## Carrier boundary

Until those inputs are available, the open Rev 5 PCB package treats the vendor subsystem as `J1 VENDOR_COMPUTE_RF`. The carrier can be mechanically packaged and its public safety/sensor/power blocks can be reviewed, but the proprietary subsystem is not back-filled with guessed pins or traces.

## Release rule

No generated file may set `gerbers_ready=true` or `assembly_release_ready=true` until a reviewed vendor-interface mapping exists and a real board has passed ERC/DRC plus SI/PI/RF/thermal review.
