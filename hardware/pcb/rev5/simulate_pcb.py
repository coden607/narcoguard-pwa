import json
import math
from pathlib import Path

ROOT=Path(__file__).parent
DIST=ROOT/"dist"
DIST.mkdir(parents=True,exist_ok=True)

spec=json.loads((ROOT/"board-spec.json").read_text())
caps=json.loads((ROOT/"pcbway-capabilities.json").read_text())

def microstrip_z0(width_mm,height_mm=0.10,er=4.1):
    u=width_mm/height_mm
    ee=(er+1)/2 + (er-1)/2*(1/math.sqrt(1+12/u))
    if u <= 1:
        return (60/math.sqrt(ee))*math.log(8/u+0.25*u)
    return (120*math.pi)/(math.sqrt(ee)*(u+1.393+0.667*math.log(u+1.444)))

def diff_z(z0, gap_mm, height_mm=0.10):
    # First-order coupled-microstrip estimate for feasibility only.
    return 2*z0*(1-0.48*math.exp(-0.96*gap_mm/height_mm))

def skin_temp(ambient_c,power_w,rth_c_per_w):
    return ambient_c+power_w*rth_c_per_w

candidate_50_width=0.20
single_z=round(microstrip_z0(candidate_50_width),2)
candidate_diff_width=0.16
candidate_diff_gap=0.15
base=microstrip_z0(candidate_diff_width)
diff100=round(diff_z(base,candidate_diff_gap),2)

scenarios={
    "safety_core_idle":{"power_w":0.08,"rth_c_per_w":12.0},
    "safety_core_alert":{"power_w":0.22,"rth_c_per_w":12.0},
    "charging_core_only":{"power_w":0.35,"rth_c_per_w":12.0},
}
thermal={}
for name,s in scenarios.items():
    thermal[name]={
        **s,
        "ambient_c":25,
        "estimated_skin_side_c":round(skin_temp(25,s["power_w"],s["rth_c_per_w"]),2),
        "status":"pass" if skin_temp(25,s["power_w"],s["rth_c_per_w"]) < 40 else "review"
    }

report={
    "schema":1,
    "status":"engineering-feasibility simulation; not physical validation",
    "stackup_assumption":{"er":4.1,"reference_height_mm":0.10,"copper_mm":0.018},
    "impedance":{
        "single_ended_50_candidate":{"width_mm":candidate_50_width,"estimated_ohm":single_z,"status":"candidate"},
        "differential_100_candidate":{"width_mm":candidate_diff_width,"gap_mm":candidate_diff_gap,"estimated_ohm":diff100,"status":"candidate"},
        "rule":"PCBWay must recalculate final widths against the selected production stackup/coupon."
    },
    "thermal_lumped":thermal,
    "power":{
        "safety_core_peak_w":0.22,
        "candidate_vbat_trace_mm":spec["design_rules"]["power_main_mm"] if "power_main_mm" in spec["design_rules"] else 0.30,
        "status":"pass for modeled safety/core scenarios only; vendor compute/RF module excluded"
    },
    "geometry":{
        "fine_trace_mm":spec["design_rules"]["fine_trace_mm"],
        "fine_space_mm":spec["design_rules"]["fine_space_mm"],
        "pcbway_hdi_min_trace_mm":caps["advanced"]["min_trace_mm"],
        "pcbway_hdi_min_space_mm":caps["advanced"]["min_spacing_mm"],
        "laser_via_drill_mm":spec["design_rules"]["laser_via_drill_mm"],
        "status":"pass" if spec["design_rules"]["fine_trace_mm"]>=caps["advanced"]["min_trace_mm"] and spec["design_rules"]["fine_space_mm"]>=caps["advanced"]["min_spacing_mm"] else "fail"
    },
    "release_limits":[
        "No antenna EM/coexistence pass without selected antenna, enclosure RF window and vendor RF model.",
        "No full-system thermal pass without W5+/X35 measured power map and enclosure material/contact model.",
        "No SI/PI signoff without final vendor pinout, stackup and routed board.",
        "No medical or clinical performance inference from these simulations."
    ]
}
(DIST/"pcb-simulation-report.json").write_text(json.dumps(report,indent=2))
assert report["geometry"]["status"]=="pass"
assert all(v["status"]=="pass" for v in thermal.values())
assert 45 <= single_z <= 55
print(json.dumps(report,indent=2))
print("Rev 5 PCB feasibility simulations: PASS under stated assumptions")
