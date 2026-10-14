import argparse
import csv
import json
import math
from pathlib import Path

import cadquery as cq

# Manufacturer-backed packages. Dimensions in mm.
MANUFACTURER_PACKAGES = {
    "nrf5340_aqfn94": (7.00, 7.00, 0.85),
    "lsm6dso32x_lga14": (2.50, 3.00, 0.86),
    "bmp390_lga10": (2.00, 2.00, 0.75),
    "max86178_wlp": (2.77, 2.57, 0.60),
    "mlx90632_qfn": (3.00, 3.00, 1.00),
}

MODELS = {
    "NG46": {"diameter":46.0,"thickness":13.8,"board_d":39.9,"display":36.8,"battery":(28.0,22.0,5.0),"optical":12.0,"qi":(18.0,30.0),"camera":(6.0,6.0,3.6),"strap":22.0},
    "NG40": {"diameter":40.0,"thickness":12.2,"board_d":34.2,"display":30.5,"battery":(24.0,19.0,4.2),"optical":10.0,"qi":(15.0,25.0),"camera":(5.2,5.2,3.2),"strap":20.0},
}

FABRICATION_PARTS = {
    "case_shell": {"process": "CNC / prototype additive", "material": "Ti-6Al-4V target", "critical": True},
    "case_back": {"process": "CNC / ceramic prototype", "material": "zirconia ceramic target", "critical": True},
    "pcb": {"process": "rigid-flex PCB fabrication", "material": "stackup TBD", "critical": True},
    "display": {"process": "supplier module", "material": "AMOLED module", "critical": False},
    "sensor_window": {"process": "optical window fabrication", "material": "optical ceramic/glass TBD", "critical": True},
    "qi_coil": {"process": "supplier coil / flex", "material": "copper coil", "critical": False},
    "battery": {"process": "supplier cell", "material": "Li-ion polymer", "critical": True},
}

TOLERANCE_ROWS = [
    ("case_outer_diameter", "CASE", "diameter", "±0.10", "concept target", "CMM / caliper", "Supplier capability study required"),
    ("case_total_thickness", "CASE", "thickness", "±0.15", "concept target", "height gauge", "Includes sealing stack; final GD&T after gasket selection"),
    ("pcb_outer_diameter", "PCB", "board_d", "±0.10", "concept target", "optical/CMM", "Board house stackup and route tolerance supersede"),
    ("display_pocket", "DISPLAY", "display", "+0.20 / +0.35 clearance", "concept target", "CMM", "Final supplier drawing required"),
    ("sensor_window_diameter", "SENSOR", "optical", "+0.10 / +0.20 clearance", "concept target", "CMM", "Seal and adhesive system not frozen"),
    ("qi_coil_outer_diameter", "POWER", "qi_outer", "±0.20", "concept target", "optical", "Supplier coil drawing required"),
    ("battery_envelope", "POWER", "battery", "+0.50 each side", "DFM reserve", "CMM", "Replace with selected-cell swelling data"),
]

def box(w,d,h,x,y,z):
    return cq.Workplane("XY").box(w,d,h,centered=(True,True,False)).translate((x,y,z))

def disk(d,h,z):
    return cq.Workplane("XY").circle(d/2).extrude(h).translate((0,0,z))

def ring(od,id_,h,z):
    return cq.Workplane("XY").circle(od/2).circle(id_/2).extrude(h).translate((0,0,z))

def build(name):
    p=MODELS[name]
    battery_z=1.55
    pcb_z=battery_z+p["battery"][2]+0.35
    comp_z=pcb_z+0.80
    display_z=comp_z+1.35
    parts={
      "case_shell": ring(p["diameter"],p["board_d"]+0.6,p["thickness"]-1.0,0.45),
      "case_back": disk(p["diameter"]-2.0,1.35,0),
      "battery": box(*p["battery"],0,0,battery_z),
      "pcb": disk(p["board_d"],0.8,pcb_z),
      "display": disk(p["display"],1.25,display_z),
      "sensor_window": disk(p["optical"],0.65,0.15),
      "qi_coil": ring(p["qi"][1],p["qi"][0],0.45,0.55),
    }
    if name=="NG46":
        comps={
          "snapdragon":box(18,18,1.1,-5.5,-1.0,comp_z),
          "nrf5340":box(*MANUFACTURER_PACKAGES["nrf5340_aqfn94"],-3,12,comp_z),
          "st54k":box(4.5,4.5,0.7,-6,-14,comp_z),
          "imu":box(*MANUFACTURER_PACKAGES["lsm6dso32x_lga14"],5,-13,comp_z),
          "bmp390":box(*MANUFACTURER_PACKAGES["bmp390_lga10"],9,-12,comp_z),
          "sdx35_rf":box(14,16,1.0,10.5,1.0,pcb_z-1.2),
          "emmc":box(11.5,13,0.7,-6,4.5,pcb_z-0.85),
        }
    else:
        comps={
          "snapdragon":box(18,18,1.1,-4,0,comp_z),
          "nrf5340":box(*MANUFACTURER_PACKAGES["nrf5340_aqfn94"],0,12.5,comp_z),
          "st54k":box(4.5,4.5,0.7,-1,-11.3,comp_z),
          "imu":box(*MANUFACTURER_PACKAGES["lsm6dso32x_lga14"],5,-11.5,comp_z),
          "bmp390":box(*MANUFACTURER_PACKAGES["bmp390_lga10"],8.5,-10.2,comp_z),
          "sdx35_rf":box(12,12,1.0,7,4.5,pcb_z-1.2),
          "emmc":box(11.5,13,0.7,-6,4.2,pcb_z-0.85),
        }
    parts["max86178"]=box(*MANUFACTURER_PACKAGES["max86178_wlp"],-2.1,0,0.72)
    parts["mlx90632"]=box(*MANUFACTURER_PACKAGES["mlx90632_qfn"],2.2,0,0.72)
    parts.update(comps)
    return parts

def compound(parts):
    return cq.Compound.makeCompound([part.val() for part in parts.values()])

def export_step(shape, path):
    cq.exporters.export(shape, str(path), exportType="STEP")

def export_stl(shape, path):
    cq.exporters.export(shape, str(path), exportType="STL", tolerance=0.08, angularTolerance=0.15, opt={"ascii": True})

def exploded(parts):
    exploded_shapes=[]
    order=list(parts)
    for index,key in enumerate(order):
        gap=index*3.0
        exploded_shapes.append(parts[key].translate((0,0,gap)).val())
    return cq.Compound.makeCompound(exploded_shapes)

def export_profiles(name, output_dir):
    p=MODELS[name]
    profile_dir=output_dir/"profiles"
    profile_dir.mkdir(parents=True,exist_ok=True)
    pcb=cq.Workplane("XY").circle(p["board_d"]/2)
    case_back=cq.Workplane("XY").circle((p["diameter"]-2.0)/2)
    sensor=cq.Workplane("XY").circle(p["optical"]/2)
    cq.exporters.exportDXF(pcb,str(profile_dir/f"{name.lower()}-pcb-outline.dxf"))
    cq.exporters.exportDXF(case_back,str(profile_dir/f"{name.lower()}-case-back-outline.dxf"))
    cq.exporters.exportDXF(sensor,str(profile_dir/f"{name.lower()}-sensor-window-outline.dxf"))

def write_tolerance_table(name, output_dir):
    p=MODELS[name]
    values={
        "diameter":p["diameter"],
        "thickness":p["thickness"],
        "board_d":p["board_d"],
        "display":p["display"],
        "optical":p["optical"],
        "qi_outer":p["qi"][1],
        "battery":f'{p["battery"][0]} x {p["battery"][1]} x {p["battery"][2]}',
    }
    path=output_dir/f"{name.lower()}-rev5-tolerance-gdt.csv"
    with path.open("w",newline="",encoding="utf-8") as handle:
        writer=csv.writer(handle)
        writer.writerow(["feature_id","datum_system","nominal_mm","tolerance_or_clearance","status","inspection_method","note"])
        for feature,datum,value_key,tol,status,method,note in TOLERANCE_ROWS:
            writer.writerow([feature,datum,values[value_key],tol,status,method,note])
    return path

def export_fabrication_package(name, parts, output_dir):
    variant_dir=output_dir/name.lower()
    part_dir=variant_dir/"parts"
    assembly_dir=variant_dir/"assemblies"
    part_dir.mkdir(parents=True,exist_ok=True)
    assembly_dir.mkdir(parents=True,exist_ok=True)

    full=compound(parts)
    export_step(full,assembly_dir/f"{name.lower()}-rev5-assembly.step")
    export_stl(full,assembly_dir/f"{name.lower()}-rev5-assembly.stl")
    exp=exploded(parts)
    export_step(exp,assembly_dir/f"{name.lower()}-rev5-exploded.step")
    export_stl(exp,assembly_dir/f"{name.lower()}-rev5-exploded.stl")

    manifest=[]
    for key,part in parts.items():
        step=part_dir/f"{name.lower()}-{key}.step"
        stl=part_dir/f"{name.lower()}-{key}.stl"
        export_step(part,step)
        export_stl(part,stl)
        bb=part.val().BoundingBox()
        meta=FABRICATION_PARTS.get(key,{"process":"supplier/reference package","material":"supplier-defined","critical":False})
        manifest.append({
            "part":key,
            "step":str(step.relative_to(output_dir)),
            "stl":str(stl.relative_to(output_dir)),
            "bbox_mm":[round(bb.xlen,3),round(bb.ylen,3),round(bb.zlen,3)],
            **meta,
        })

    export_profiles(name,variant_dir)
    tolerance_path=write_tolerance_table(name,variant_dir)
    payload={
        "schema":1,
        "variant":name,
        "status":"fabrication-oriented concept package",
        "assembly_step":str((assembly_dir/f"{name.lower()}-rev5-assembly.step").relative_to(output_dir)),
        "exploded_step":str((assembly_dir/f"{name.lower()}-rev5-exploded.step").relative_to(output_dir)),
        "tolerance_table":str(tolerance_path.relative_to(output_dir)),
        "parts":manifest,
        "release_ready":False,
        "release_blockers":[
            "supplier CAD and routed PCB data",
            "final GD&T and tolerance stack",
            "RF/antenna signoff",
            "thermal/ingress validation",
            "physical prototype inspection",
            "drug-device engineering remains separate and unvalidated",
        ],
    }
    (variant_dir/f"{name.lower()}-rev5-manifest.json").write_text(json.dumps(payload,indent=2),encoding="utf-8")
    return payload

def validate(name,parts):
    radius=MODELS[name]["board_d"]/2
    failures=[]
    comp_names=["snapdragon","nrf5340","st54k","imu","bmp390","sdx35_rf","emmc"]
    for key in comp_names:
        bb=parts[key].val().BoundingBox()
        rmax=max(math.hypot(x,y) for x in (bb.xmin,bb.xmax) for y in (bb.ymin,bb.ymax))
        if rmax>radius:
            failures.append(f"{key} exceeds board")
    for i,a_name in enumerate(comp_names):
        a=parts[a_name].val().BoundingBox()
        for b_name in comp_names[i+1:]:
            b=parts[b_name].val().BoundingBox()
            if min(a.xmax,b.xmax)>max(a.xmin,b.xmin) and min(a.ymax,b.ymax)>max(a.ymin,b.ymin) and min(a.zmax,b.zmax)>max(a.zmin,b.zmin):
                failures.append(f"{a_name} collides with {b_name}")
    zmax=max(parts[k].val().BoundingBox().zmax for k in ["case_back","battery","pcb","display"]+comp_names)
    if zmax>MODELS[name]["thickness"]:
        failures.append(f"core stack {zmax:.2f} exceeds case {MODELS[name]['thickness']:.2f}")
    return failures

if __name__=="__main__":
    parser=argparse.ArgumentParser(description="Validate and export NarcoGuard Rev 5 fabrication-oriented concept CAD")
    parser.add_argument("--output-dir",default=str(Path(__file__).parent/"dist"),help="Directory for generated CAD exports")
    parser.add_argument("--validate-only",action="store_true",help="Run fit checks without writing CAD exports")
    args=parser.parse_args()
    output_dir=Path(args.output_dir)

    package_index={"schema":1,"revision":"Rev 5","variants":[],"release_ready":False}
    for name in MODELS:
        parts=build(name)
        failures=validate(name,parts)
        if failures:
            raise SystemExit(f"{name}: "+"; ".join(failures))
        print(f"{name}: PASS envelope fit")
        if not args.validate_only:
            package_index["variants"].append(export_fabrication_package(name,parts,output_dir))
            print(f"{name}: exported assembly, exploded, per-part STEP/STL, DXF profiles and tolerance table")

    if not args.validate_only:
        (output_dir/"rev5-package-index.json").write_text(json.dumps(package_index,indent=2),encoding="utf-8")
        print(f"Fabrication-oriented package index: {output_dir/'rev5-package-index.json'}")
