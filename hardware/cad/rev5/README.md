# NarcoGuard NG Rev 5 CAD

Parametric mechanical-envelope CAD for the **NG46 rugged** and **NG40 elegant** editions.

## Current fit result

Both models pass the current envelope-level gates:
- modeled component envelopes remain inside their circular PCB boundaries;
- zero pairwise component-envelope collisions;
- modeled core z-stack remains inside the stated case thickness.

The NG40 required two placement corrections discovered by CAD: the 12×12 mm RF envelope was moved inward, and the ST54K location was shifted to clear the Snapdragon envelope.

## Truth boundary

This is **not manufacturing-ready CAD**. Snapdragon W5+ Gen 2 / SDX35 integration still uses design envelopes until supplier mechanical CAD is locked. PCB routing, flex, screws, adhesives, gasket compression, battery swelling, thermal paths, antenna keep-outs/matching, camera-shutter sealing, crown-generator mechanics and regulatory testing remain open.

Replace every placeholder envelope with vendor STEP/IGES geometry before DFM.

## Generated CAD package

`build_rev5.py` now exports concept CAD for both watch sizes after the envelope/interference checks pass:

- `dist/ng46-rev5-concept.step`
- `dist/ng46-rev5-concept.stl`
- `dist/ng40-rev5-concept.step`
- `dist/ng40-rev5-concept.stl`

Run:

```bash
python hardware/cad/rev5/build_rev5.py
```

Use `--validate-only` when exports are not needed. GitHub Actions publishes the generated STEP/STL files as the `narcoguard-rev5-cad-<sha>` artifact on each CAD workflow run.

These are **concept engineering exports**, not production tooling files. Supplier CAD, routed PCB data, GD&T/tolerance stack, antenna/RF signoff, thermal/ingress validation, drug-device engineering, and physical prototype evidence remain required before manufacturing or medical-use claims.
