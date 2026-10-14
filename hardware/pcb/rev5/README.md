# NarcoGuard Rev 5 PCB engineering package

This directory is the PCB counterpart to `hardware/cad/rev5`.

It creates a **PCBWay quote/review and engineering package** for an 8-layer HDI safety/core carrier while keeping Qualcomm W5+/X35 production routing behind a vendor-approved module boundary. That boundary is intentional: the repository does not contain the proprietary package/pinout/reference-routing data needed to safely invent DDR, PMIC, BGA escape or cellular RF routing.

## PCBWay target

The conservative candidate rules use 0.10/0.10 mm as default and 0.08/0.08 mm only for local escape. PCBWay's official advanced/HDI capability pages list finer minimums, including 0.065/0.065 mm HDI trace/space, 0.10 mm laser vias and 0.4 mm BGA pitch; the final order still requires PCBWay engineering review and impedance stackup confirmation.

## Generated outputs

Run:

```bash
python hardware/pcb/rev5/simulate_pcb.py
python hardware/pcb/rev5/validate_pcbway.py
python hardware/pcb/rev5/generate_quote_package.py
```

Generated files include:
- simulation report;
- PCBWay capability/constraint report;
- BOM and placement CSVs;
- fabrication/stackup notes;
- netclass/routing notes;
- per-variant board-outline SVG/DXF-like review drawings;
- package manifest.

No fake Gerbers or NC-drill files are generated. Those are intentionally release-blocked until the actual validated electrical netlist and vendor compute/RF interface are available.

## Status labels

- **simulation pass** means the repository's mathematical feasibility checks passed under the stated assumptions.
- **PCBWay-compatible constraints** means the candidate geometry stays within PCBWay's published capability envelope.
- Neither means the watch is electrically, RF, thermally, medically or production validated.
