# Rev 5 DFM constraint pass

This pass adds explicit **design-for-manufacture gates** without pretending unknown vendor data is known.

## Added gates

- battery swelling reserve around the cell envelope;
- top/bottom battery clearance;
- gasket land and compression target range;
- camera-module and shutter-travel clearance;
- crown-generator shaft/service keep-out;
- rigid-flex routing channel and minimum bend-radius rule;
- mandatory RF keep-out / RF-window requirement for a titanium enclosure;
- thermal rules forbidding a direct SoC-to-skin path and direct battery contact with major heat sources.

## Why some dimensions remain TBD

The following cannot be responsibly fixed until the actual supplier/reference design is locked:
- W5+ Gen 2 mechanical package and reference board;
- X35/SDX35 RF front-end and antenna topology;
- selected display flex tail;
- selected battery vendor swelling limits;
- camera lens and shutter travel;
- elastomer gasket cross-section/hardness;
- antenna vendor keep-outs;
- rigid-flex material stack.

The model should fail closed: if one of those supplier constraints is unknown, the CAD may remain a concept but must not be called DFM-ready.

## Variant policy

**NG46** is the lead engineering platform for the crown generator and automatic rotor.

**NG40** keeps the same mission and core electronics, but the automatic rotor and camera are optional at DFM freeze if they cause unacceptable thickness, heat, RF, or sealing compromises.
