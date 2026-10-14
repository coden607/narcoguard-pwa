# Rev 5 PCB routing plan

This is the routed-design **engineering contract** for the PCBWay candidate board. It does not pretend to contain proprietary Qualcomm production routing.

## Architecture

The board is split into two electrical responsibilities:

1. **Safety/core carrier** — public datasheet parts: nRF5340, candidate sensor AFEs/MEMS, charging, Qi receive, eUICC, flex and board-to-board connectors.
2. **Vendor compute/RF module boundary** — W5+ Gen 2/X35, LPDDR/eMMC and production RF front end remain behind a vendor-approved module/interface until Qualcomm package/pinout/reference-routing data is legally available.

This avoids inventing DDR, PMIC, BGA escape, RF matching or modem routing.

## Layer use

- F.Cu — short component escape / low-current signals
- GND1 — continuous reference plane
- SIG1 — high-speed/control
- PWR — split low-noise power islands
- PWR2 — battery/charger and regulated rails
- SIG2 — secondary signals
- GND2 — continuous reference plane
- B.Cu — sensor/Qi/connector escape

## Routing constraints

- Default: 0.10/0.10 mm trace/space.
- Fine local escape: 0.08/0.08 mm, still above PCBWay's listed advanced HDI 0.065/0.065 mm capability.
- Laser microvia target: 0.10 mm drill / 0.25 mm pad.
- Mechanical via target: 0.20 mm drill / 0.45 mm pad.
- 50 Ω single-ended and 90/100 Ω differential widths are **vendor-solved after stackup selection**; do not hard-code impedance geometry before PCBWay returns the finished stack.
- Keep analog biosensor nets away from Qi switching, charger switch node, cellular/Wi-Fi feeds and haptic drive.
- RF feeds must remain inside a vendor RF boundary with antenna keep-out and enclosure co-design.
- Titanium enclosure requires RF window/slot strategy before antenna release.

## What is complete here

- board envelope and layer architecture;
- PCBWay-compatible minimum geometry;
- placement zones and module boundaries;
- netclass/routing constraints;
- deterministic impedance/thermal/power feasibility simulation inputs;
- fabrication/assembly quote package generator;
- fail-closed checks that prevent calling the package production-ready.

## What remains external

Final production routing for W5+/X35/DDR/RF requires proprietary/reference design data. RF matching, antenna EM, exact impedance coupons, assembly panelization and physical SI/PI/thermal verification require the selected vendor/PCBWay stack and prototype measurements.
