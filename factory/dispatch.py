"""The dispatcher. Deterministic, never a model (FACTORY_RULES.md 8).

Reads GitHub state and prints ONE JSON action for this hourly run:

    {"action": "rollback" | "fix-pr" | "escalate" | "validate-pr" | "implement" | "triage" | "idle", "target": <number|null>, "reason": "..."}

Usage:
    python3 factory/dispatch.py            # live GitHub state
    python3 factory/dispatch.py state.json # a saved snapshot (tests)

Fixed priority, finish in-flight work first: fix a PR -> validate a PR -> implement an issue -> triage.
Strictly serial: no new implementation starts while a factory PR is open and not escalated.
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request

REPO = os.environ.get("FACTORY_REPO", "coden607/narcoguard-pwa")
API = "https://api.github.com"
OWNER = "coden607"
PRIORITY = ["priority:critical", "priority:high", "priority:medium", "priority:low"]
BLOCKING = {"factory:needs-human", "factory:rejected", "factory:stop"}
REQUIRED_CHECKS = {"quality", "pwa-browser-smoke", "lighthouse", "gate"}
MAX_FIX_ATTEMPTS = 2


def get(path: str):
    request = urllib.request.Request(f"{API}{path}", headers={"Accept": "application/vnd.github+json", "User-Agent": "narcoguard-factory"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main_file(path: str) -> str | None:
    """A file's content on origin/main, so a branch cannot change the dial or the stop button for itself."""
    subprocess.run(["git", "fetch", "-q", "origin", "main"], capture_output=True)
    result = subprocess.run(["git", "show", f"origin/main:{path}"], capture_output=True, text=True)
    return result.stdout if result.returncode == 0 else None


def live_state() -> dict:
    issues = get(f"/repos/{REPO}/issues?state=open&per_page=100")
    pulls = get(f"/repos/{REPO}/pulls?state=open&per_page=100")
    prs = []
    for pr in pulls:
        if not pr["head"]["ref"].startswith("factory/issue-"):
            continue
        runs = get(f"/repos/{REPO}/commits/{pr['head']['sha']}/check-runs?per_page=100")["check_runs"]
        prs.append({
            "number": pr["number"],
            "head": pr["head"]["ref"],
            "labels": [label["name"] for label in pr["labels"]],
            "checks": {run["name"]: run["conclusion"] or run["status"] for run in runs},
        })
    return {
        "stop_file": main_file(".factory/STOP") is not None,
        "autonomy": int((main_file(".factory/locks/autonomy") or "0").strip() or 0),
        "issues": [
            {"number": i["number"], "author": i["user"]["login"], "labels": [label["name"] for label in i["labels"]]}
            for i in issues if "pull_request" not in i
        ],
        "prs": prs,
    }


def decide(state: dict) -> dict:
    def out(action: str, target=None, reason: str = "") -> dict:
        return {"action": action, "target": target, "reason": reason}

    issues, prs = state["issues"], state["prs"]
    if any("factory:rollback" in i["labels"] for i in issues):
        # A broken live site outranks everything, including the stop button.
        return out("rollback", next(i["number"] for i in issues if "factory:rollback" in i["labels"]), "live check failed and no instant rollback ran")
    if state.get("stop_file") or any("factory:stop" in i["labels"] for i in issues):
        return out("idle", reason="stop button pressed (.factory/STOP or factory:stop label)")
    level = state.get("autonomy", 0)
    if level < 1:
        return out("idle", reason="autonomy 0: the factory only runs by hand")

    live = [p for p in prs if not BLOCKING & set(p["labels"]) and "factory:merged" not in p["labels"]]
    for pr in live:
        checks = pr["checks"]
        failed = [name for name in REQUIRED_CHECKS if checks.get(name) in ("failure", "timed_out", "cancelled", "action_required")]
        attempts = sum(1 for label in pr["labels"] if label.startswith("factory:fix-"))
        if failed or "factory:changes-requested" in pr["labels"]:
            if attempts >= MAX_FIX_ATTEMPTS:
                return out("escalate", pr["number"], f"{attempts} fix attempts used (FACTORY_RULES.md 7.2.6)")
            return out("fix-pr", pr["number"], f"failing: {', '.join(sorted(failed)) or 'validator requested changes'}")
    if level >= 2:
        for pr in live:
            done = all(pr["checks"].get(name) == "success" for name in REQUIRED_CHECKS)
            if done and "factory:validated" not in pr["labels"] and "factory:assumption" not in pr["labels"]:
                return out("validate-pr", pr["number"], "all required checks green, no verdict yet")
    if live:
        return out("idle", reason=f"waiting on PR #{live[0]['number']} (serial: one change in flight)")

    in_flight = {int(p["head"].removeprefix("factory/issue-")) for p in prs if p["head"].removeprefix("factory/issue-").isdigit()}
    accepted = [i for i in issues if "factory:accepted" in i["labels"] and not BLOCKING & set(i["labels"]) and i["number"] not in in_flight]
    if accepted:
        rank = lambda i: min((PRIORITY.index(label) for label in i["labels"] if label in PRIORITY), default=len(PRIORITY))
        best = sorted(accepted, key=lambda i: (rank(i), i["number"]))[0]
        return out("implement", best["number"], "highest-priority accepted issue")

    untriaged = [i for i in issues if not any(label.startswith("factory:") for label in i["labels"])]
    if untriaged:
        return out("triage", [i["number"] for i in untriaged[:10]], f"{len(untriaged)} untriaged issue(s)")
    return out("idle", reason="nothing to do")


if __name__ == "__main__":
    state = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else live_state()
    print(json.dumps(decide(state)))
