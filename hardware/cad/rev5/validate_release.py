import json
import sys
from pathlib import Path

ROOT=Path(__file__).parent
status=json.loads((ROOT/"simulation-status.json").read_text())
dfm=json.loads((ROOT/"dfm-constraints.json").read_text())

concept=status["concept_gates"]
failed=[name for name,value in concept.items() if value!="pass"]
if failed:
    raise SystemExit("Concept simulation gate failed: "+", ".join(failed))

assert dfm["rules"]["battery"]["swelling_clearance_each_side"] > 0
assert dfm["rules"]["camera"]["module_to_case_clearance"] > 0
assert dfm["rules"]["crown_generator"]["radial_keepout"] > 0
assert dfm["rules"]["antenna"]["metal_keepout_required"] is True
assert dfm["rules"]["thermal"]["temperature_validation_required"] is True

if "--release" in sys.argv:
    blocked=[name for name,value in status["release_gates"].items() if value!="pass"]
    if blocked or status.get("release_ready") is not True:
        raise SystemExit("RELEASE BLOCKED; evidence still required: "+", ".join(blocked))

print("Rev 5 concept CAD/simulation gates: PASS")
print("Release readiness: BLOCKED pending external/vendor/physical evidence")
