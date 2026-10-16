"""Every dispatcher rule, one snapshot each. Run: python3 factory/test_dispatch.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from dispatch import decide

green = {n: "success" for n in ("quality", "pwa-browser-smoke", "lighthouse", "gate")}
def pr(n, labels=(), checks=None): return {"number": n, "head": f"factory/issue-{n - 100}", "labels": list(labels), "checks": checks or dict(green)}
def issue(n, *labels): return {"number": n, "author": "coden607", "labels": list(labels)}
def s(**k): return {"stop_file": False, "autonomy": 3, "issues": [], "prs": [], **k}

cases = [
    ("stop file", s(stop_file=True, issues=[issue(1, "factory:accepted")]), "idle"),
    ("stop label", s(issues=[issue(1, "factory:stop"), issue(2, "factory:accepted")]), "idle"),
    ("dial 0", s(autonomy=0, issues=[issue(1)]), "idle"),
    ("failing check -> fix", s(prs=[pr(105, checks={**green, "gate": "failure"})]), "fix-pr"),
    ("changes requested -> fix", s(prs=[pr(105, ["factory:changes-requested"])]), "fix-pr"),
    ("two fixes used -> escalate", s(prs=[pr(105, ["factory:changes-requested", "factory:fix-1", "factory:fix-2"])]), "escalate"),
    ("green, no verdict -> validate", s(prs=[pr(105)]), "validate-pr"),
    ("dial 1 never validates", s(autonomy=1, prs=[pr(105)]), "idle"),
    ("pending checks -> wait", s(prs=[pr(105, checks={**green, "gate": "in_progress"})], issues=[issue(7, "factory:accepted")]), "idle"),
    ("validated -> wait for merge", s(prs=[pr(105, ["factory:validated"])], issues=[issue(7, "factory:accepted")]), "idle"),
    ("escalated PR does not block", s(prs=[pr(105, ["factory:needs-human"])], issues=[issue(7, "factory:accepted", "priority:low"), issue(9, "factory:accepted", "priority:critical")]), "implement"),
    ("untriaged -> triage", s(issues=[issue(3), issue(4, "automated-health-check")]), "triage"),
    ("nothing", s(), "idle"),
    ("skipped required check -> fix, not wait forever", s(prs=[pr(105, checks={**green, "lighthouse": "skipped"})]), "fix-pr"),
    ("neutral required check -> fix", s(prs=[pr(105, checks={**green, "gate": "neutral"})]), "fix-pr"),
    ("rollback beats stop and dial 0", s(stop_file=True, autonomy=0, issues=[issue(12, "factory:rollback", "factory:needs-human")]), "rollback"),
]
bad = 0
for name, state, want in cases:
    got = decide(state)
    ok = got["action"] == want
    bad += not ok
    print(f"{'ok ' if ok else 'BAD'} {name}: {got}")
assert decide(cases[10][1])["target"] == 9, "critical first"
print("DISPATCH_TESTS_OK" if not bad else f"DISPATCH_TESTS_FAILED={bad}")
sys.exit(1 if bad else 0)
