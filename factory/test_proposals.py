"""Run: python3 factory/test_proposals.py"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from proposals import decide, next_item

B = "- [ ] A title | why | S\n- [ ] B | y | M\n"
cases = [
    ("empty repo proposes first", decide([], B)["action"], "propose"),
    ("first unchecked wins", decide([], B)["item"]["title"], "A title"),
    ("open proposal blocks", decide([["factory:proposed"]], B)["action"], "idle"),
    ("open accepted blocks", decide([["factory:accepted", "priority:low"]], B)["action"], "idle"),
    ("stop label blocks", decide([["factory:stop"]], B)["action"], "idle"),
    ("needs-human alone does not block", decide([["factory:needs-human"]], B)["action"], "propose"),
    ("checked items skipped", next_item("- [x] done | a | S\n- [ ] next | b | M")["title"], "next"),
    ("empty backlog idles", decide([], "# nothing")["action"], "idle"),
]
bad = [c[0] for c in cases if c[1] != c[2]]
print("PROPOSALS_OK" if not bad else f"FAIL {bad}", len(cases))
sys.exit(1 if bad else 0)
