import csv
import json
from pathlib import Path

ROOT=Path(__file__).parent
DIST=ROOT/"dist"
INDEX=DIST/"rev5-package-index.json"

if not INDEX.exists():
    raise SystemExit("Missing Rev 5 package index")

index=json.loads(INDEX.read_text(encoding="utf-8"))
assert index["schema"]==1
assert index["revision"]=="Rev 5"
assert index["release_ready"] is False
assert {v["variant"] for v in index["variants"]}=={"NG46","NG40"}

required_parts={"case_shell","case_back","battery","pcb","display","sensor_window","qi_coil","snapdragon","nrf5340","st54k","imu","bmp390","sdx35_rf","emmc","max86178","mlx90632"}

for variant in index["variants"]:
    name=variant["variant"].lower()
    base=DIST/name
    assert (base/"assemblies"/f"{name}-rev5-assembly.step").exists()
    assert (base/"assemblies"/f"{name}-rev5-assembly.stl").exists()
    assert (base/"assemblies"/f"{name}-rev5-exploded.step").exists()
    assert (base/"assemblies"/f"{name}-rev5-exploded.stl").exists()
    assert (base/"profiles"/f"{name}-pcb-outline.dxf").exists()
    assert (base/"profiles"/f"{name}-case-back-outline.dxf").exists()
    assert (base/"profiles"/f"{name}-sensor-window-outline.dxf").exists()

    parts={item["part"] for item in variant["parts"]}
    assert required_parts.issubset(parts)
    for item in variant["parts"]:
        assert (DIST/item["step"]).exists(), item["step"]
        assert (DIST/item["stl"]).exists(), item["stl"]
        assert len(item["bbox_mm"])==3
        assert all(value>0 for value in item["bbox_mm"])

    gdt=DIST/variant["gdt_plan"]
    assert gdt.exists()
    gdt_text=gdt.read_text(encoding="utf-8")
    assert "NOT RELEASED FOR TOOLING" in gdt_text
    assert "DATUM A" in gdt_text and "DATUM B" in gdt_text and "DATUM C" in gdt_text

    tolerance=DIST/variant["tolerance_table"]
    with tolerance.open(newline="",encoding="utf-8") as handle:
        rows=list(csv.DictReader(handle))
    assert len(rows)>=7
    assert {row["feature_id"] for row in rows}>={"case_outer_diameter","case_total_thickness","pcb_outer_diameter","battery_envelope"}

    assert variant["release_ready"] is False
    assert len(variant["release_blockers"])>=5

print("Rev 5 fabrication package: PASS")
