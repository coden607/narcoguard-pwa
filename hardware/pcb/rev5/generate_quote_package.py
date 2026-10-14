import csv
import json
from pathlib import Path

ROOT=Path(__file__).parent
DIST=ROOT/"dist"
DIST.mkdir(parents=True,exist_ok=True)
spec=json.loads((ROOT/"board-spec.json").read_text())
placement=list(csv.DictReader((ROOT/"placement-plan.csv").open()))

bom=[
["U1","nRF5340","NRF5340-QKAA-R7","Nordic",1,"safety MCU"],
["U2","MAX86178","MAX86178","Analog Devices",1,"biosensor AFE"],
["U3","LSM6DSO32X","LSM6DSO32XTR","ST",1,"IMU"],
["U4","BMP390","BMP390","Bosch",1,"pressure sensor"],
["U5","MLX90632","MLX90632SFE-BAA-000-RE","Melexis",1,"IR temperature"],
["U6","BQ25619","BQ25619RTWR","Texas Instruments",1,"charger/power path"],
["U7","BQ51013B","BQ51013BRHLR","Texas Instruments",1,"Qi receiver"],
["U8","ST4SIM","ST4SIM-200M","ST",1,"eUICC"],
["J1","Vendor compute/RF module interface","TBD","Vendor-approved",1,"W5+/X35 boundary"],
["J2","Display flex connector","TBD","TBD",1,"display/touch"],
["J3","Sensor flex connector","TBD","TBD",1,"case-back sensor flex"],
]
with (DIST/"pcbway-bom.csv").open("w",newline="") as h:
    w=csv.writer(h); w.writerow(["Designator","Comment","MPN","Manufacturer","Qty","Notes"]); w.writerows(bom)
with (DIST/"pcbway-placement.csv").open("w",newline="") as h:
    w=csv.DictWriter(h,fieldnames=placement[0].keys()); w.writeheader(); w.writerows(placement)

notes=f"""NarcoGuard Rev 5 PCBWay quote/review package
STATUS: ENGINEERING CANDIDATE — NOT RELEASED FOR FABRICATION

Board:
- 8-layer HDI 1+6+1 candidate
- Target thickness: 0.8 mm
- Default trace/space: 0.10/0.10 mm
- Fine local escape: 0.08/0.08 mm
- Laser microvia: 0.10 mm drill / 0.25 mm pad
- Mechanical via: 0.20 mm drill / 0.45 mm pad
- ENIG candidate finish
- Controlled impedance requested for 50 ohm single-ended and 90/100 ohm differential classes

IMPORTANT:
- PCBWay must provide/finalize the production stackup and impedance geometry before routing freeze.
- This package intentionally excludes proprietary Qualcomm W5+/X35/DDR/RF production routing.
- Gerber/NC drill release is blocked until the vendor module interface and validated electrical netlist are available.
- RF, thermal, ingress, battery, EMC and physical prototype signoff remain external release gates.
"""
(DIST/"PCBWAY-FAB-NOTES.txt").write_text(notes)

for name,v in spec["variants"].items():
    radius=v["board_diameter_mm"]/2
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">
<rect width="800" height="800" fill="white"/>
<circle cx="400" cy="400" r="300" fill="none" stroke="black" stroke-width="3"/>
<circle cx="400" cy="400" r="{300*0.88:.1f}" fill="none" stroke="#777" stroke-width="2" stroke-dasharray="8 8"/>
<text x="40" y="60" font-family="monospace" font-size="26">{name} Rev 5 PCB mechanical/routing review</text>
<text x="40" y="95" font-family="monospace" font-size="18">Board Ø {v["board_diameter_mm"]} mm · 8-layer HDI candidate · NOT FAB RELEASED</text>
<text x="40" y="740" font-family="monospace" font-size="16">Component placement coordinates: placement-plan.csv</text>
</svg>'''
    (DIST/f"{name.lower()}-pcb-review.svg").write_text(svg)

manifest={
    "schema":1,
    "revision":"Rev 5",
    "status":"quote/review package",
    "files":["pcbway-bom.csv","pcbway-placement.csv","PCBWAY-FAB-NOTES.txt","pcb-simulation-report.json","pcbway-constraint-report.json","ng46-pcb-review.svg","ng40-pcb-review.svg"],
    "gerbers_ready":False,
    "nc_drill_ready":False,
    "assembly_release_ready":False,
    "blocked_by":["validated electrical netlist","vendor-approved W5+/X35 interface pinout","final PCBWay impedance stackup","RF/antenna design freeze"]
}
(DIST/"pcbway-package-manifest.json").write_text(json.dumps(manifest,indent=2))
print("PCBWay quote/review package generated")
