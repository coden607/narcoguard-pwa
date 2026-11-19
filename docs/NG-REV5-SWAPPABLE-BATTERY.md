# NarcoGuard Watch Rev 5: swappable battery concept

Copyright (c) 2026 Stephen Blanford / NarcoGuard. All rights reserved. Not licensed under MIT. This document is not covered by the repository's open-source license.

**Status: concept, not validated.** Nothing described here has been built or tested. Detailed engineering (dimensions, seal specifications and part selections) is proprietary and kept private.

## Goal

Let the wearer swap a charged battery in under a minute, without tools, while keeping the watch's IP68 water and dust protection target. A spare battery means overdose monitoring doesn't have to stop for long charging sessions.

## Concept

- **Sealed battery cartridge.** The cell, its protection electronics and its wireless-charging coil sit inside their own sealed cartridge.
- **Watch stays sealed when the battery is out.** The cartridge docks into a pocket on the back of the watch. A permanent, factory-sealed wall separates that pocket from the electronics. The wearer never opens the seal that protects the electronics.
- **Spring-clip latches.** Each end has a spring clip that hooks over a pin, pivots on a fulcrum and snaps down past centre, so it holds the cartridge under tension and won't pop open on its own. When the lever sits flush, the cartridge is fully seated.
- **Two seals at the joint.** An O-ring around the cartridge is the main seal, and a second soft seal surrounds the electrical contacts. A fresh O-ring comes with every cartridge.
- **Safe contacts.** Gold-plated spring contacts connect the cartridge to the watch. A removed cartridge switches its contacts off, so a spare carried in a pocket has no live contacts.
- **Small backup supply.** A small backup store keeps the safety processor and clock running for a short time while the cartridge is out. Vital-sign monitoring pauses during the swap, and the app will say so.

## Trade-offs being evaluated

- Extra walls and seals take some room from the battery, so capacity or case thickness may change.
- Charging may move to a NarcoGuard charging pad instead of a standard Qi pad.
- Each cartridge must be certified as a battery for safety and shipping.

## Validation still required

Planned before any claim is made: water and dust testing to IEC 60529 and ISO 22810, a 500-cycle swap test with sweat, sand and hair contamination, contact reliability, drop testing, and battery safety certification (IEC 62133-2 and UN 38.3).

NarcoGuard is not a medical device and does not replace calling 911.
