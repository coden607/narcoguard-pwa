import json
from pathlib import Path

ROOT = Path(__file__).parent
rules = json.loads((ROOT / "dfm-constraints.json").read_text())

assert rules["rules"]["battery"]["swelling_clearance_each_side"] > 0
assert 10 <= rules["rules"]["gasket"]["compression_target_percent"][0] < rules["rules"]["gasket"]["compression_target_percent"][1] <= 35
assert rules["rules"]["camera"]["module_to_case_clearance"] > 0
assert rules["rules"]["crown_generator"]["radial_keepout"] > 0
assert rules["rules"]["flex"]["bend_radius_min_multiplier_of_flex_thickness"] >= 6
assert rules["rules"]["antenna"]["metal_keepout_required"] is True
assert rules["rules"]["thermal"]["soc_to_skin_direct_path_forbidden"] is True

print("Rev 5 DFM concept gates: PASS")
