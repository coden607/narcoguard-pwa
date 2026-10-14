# PCBWay order/review parameters — NarcoGuard Rev 5

**Status:** quote / engineering review only. Do not release to fabrication until the manifest changes `gerbers_ready`, `nc_drill_ready`, and `assembly_release_ready` to true after electrical/vendor signoff.

## Candidate order parameters

| Parameter | Candidate |
| --- | --- |
| Product | HDI multilayer PCB |
| Layers | 8 |
| Build | 1+6+1 HDI candidate |
| Finished thickness | 0.8 mm target |
| Outer copper | 0.5 oz target |
| Inner copper | 0.5 oz target |
| Surface finish | ENIG candidate |
| Solder mask | Black or green; green preferred for first engineering lot due process margin |
| Min default routing | 0.10/0.10 mm |
| Fine local escape | 0.08/0.08 mm |
| Mechanical via | 0.20 mm drill / 0.45 mm pad |
| Laser microvia | 0.10 mm drill / 0.25 mm pad |
| Controlled impedance | Yes |
| Requested classes | 50 Ω SE; 90 Ω diff; 100 Ω diff |
| Impedance tolerance | PCBWay standard controlled-impedance process; confirm final stack/coupon |
| Board shape | Round, variant-specific |
| Panelization | PCBWay engineering recommendation |
| Electrical test | 100% flying-probe/e-test requested for prototype lot |
| AOI | Requested |
| Assembly | Quote after final CPL/BOM and vendor module decision |

## Before order submission

PCBWay engineering must return:
1. manufacturable 8-layer HDI stackup;
2. final dielectric/copper values;
3. controlled-impedance trace/gap recommendations;
4. microvia construction and via-fill recommendation;
5. review of round-board panelization/tooling rails;
6. confirmation of solder-mask web around selected fine-pitch parts;
7. assembly capability review for the selected packages.

The first fabrication lot should be treated as an engineering prototype only.
