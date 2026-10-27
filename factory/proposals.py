#!/usr/bin/env python3
"""Zero-token proposal feeder (FACTORY_RULES.md 13). Never a model.

Opens at most ONE issue labelled `factory:proposed` from docs/factory/BACKLOG.md, only when no
`factory:proposed` or `factory:accepted` issue is open. Triage ignores `factory:proposed`; the owner promotes it.

    python3 factory/proposals.py            # dry run: prints what it would do
    python3 factory/proposals.py --create   # opens the issue (needs GH_TOKEN, run from a workflow)
    python3 factory/proposals.py --state s.json   # saved snapshot (tests)
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

REPO = "coden607/narcoguard-pwa"
ITEM = re.compile(r"^- \[ \] (?P<title>[^|]+)\|(?P<why>[^|]*)\|(?P<size>.*)$")


def next_item(text: str) -> dict | None:
    for line in text.splitlines():
        m = ITEM.match(line.strip())
        if m:
            return {k: v.strip() for k, v in m.groupdict().items()}
    return None


def decide(open_labels: list[list[str]], backlog: str) -> dict:
    flat = {label for labels in open_labels for label in labels}
    if flat & {"factory:stop"}:
        return {"action": "idle", "reason": "factory:stop"}
    if flat & {"factory:proposed", "factory:accepted"}:
        return {"action": "idle", "reason": "a proposal or accepted issue is already open"}
    item = next_item(backlog)
    if not item:
        return {"action": "idle", "reason": "backlog empty"}
    return {"action": "propose", "item": item}


def live_labels() -> list[list[str]]:
    out = subprocess.run(["gh", "issue", "list", "-R", REPO, "--state", "open", "--limit", "200", "--json", "labels"],
                         capture_output=True, text=True, check=True).stdout
    return [[l["name"] for l in i["labels"]] for i in json.loads(out)]


def main(argv: list[str]) -> int:
    backlog = Path(__file__).resolve().parent.parent.joinpath("docs/factory/BACKLOG.md").read_text()
    if "--state" in argv:
        labels = json.load(open(argv[argv.index("--state") + 1]))
    else:
        labels = live_labels()
    result = decide(labels, backlog)
    print(json.dumps(result))
    if result["action"] == "propose" and "--create" in argv:
        item = result["item"]
        body = f"Proposed by `factory/proposals.py` from `docs/factory/BACKLOG.md`.\n\n**Why:** {item['why']}\n**Size:** {item['size']}\n\nOwner: add `factory:accepted` and one `priority:*` label to approve, or close to reject."
        subprocess.run(["gh", "label", "create", "factory:proposed", "--force", "-R", REPO], capture_output=True)
        subprocess.run(["gh", "issue", "create", "-R", REPO, "--title", item["title"], "--label", "factory:proposed", "--body", body], check=True)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
