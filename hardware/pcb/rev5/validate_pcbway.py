import json
from pathlib import Path

ROOT=Path(__file__).parent
spec=json.loads((ROOT/"board-spec.json").read_text())
caps=json.loads((ROOT/"pcbway-capabilities.json").read_text())
r=spec["design_rules"]
a=caps["advanced"]

checks={
    "fine_trace":r["fine_trace_mm"] >= a["min_trace_mm"],
    "fine_space":r["fine_space_mm"] >= a["min_spacing_mm"],
    "laser_via":r["laser_via_drill_mm"] >= a["min_laser_via_mm"],
    "mechanical_drill":r["mech_via_drill_mm"] >= a["min_mech_drill_mm"],
    "layer_count":spec["stackup"]["layers"] <= a["max_layers"],
    "bga_pitch_floor":r["bga_pitch_floor_mm"] >= a["min_bga_pitch_mm"],
}
failed=[name for name,ok in checks.items() if not ok]
out={"schema":1,"checks":checks,"status":"pass" if not failed else "fail","failed":failed,
     "rule":"Published capability fit is not an order acceptance; PCBWay engineering review and stackup confirmation remain required."}
(ROOT/"dist").mkdir(exist_ok=True)
(ROOT/"dist"/"pcbway-constraint-report.json").write_text(json.dumps(out,indent=2))
if failed:
    raise SystemExit("PCBWay constraint checks failed: "+", ".join(failed))
print("PCBWay published-capability constraint checks: PASS")
