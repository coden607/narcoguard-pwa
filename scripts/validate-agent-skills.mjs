import fs from "node:fs"
import path from "node:path"

const root = process.cwd()
const manifestPath = path.join(root, ".agent-skills", "manifest.json")
const agentsPath = path.join(root, "AGENTS.md")

const fail = (message) => {
  console.error(`agent-skills: ${message}`)
  process.exitCode = 1
}

if (!fs.existsSync(manifestPath)) {
  fail("missing .agent-skills/manifest.json")
} else {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
  if (manifest.source !== "https://github.com/coden607/skills.git") fail("unexpected skill source")
  if (!/^[0-9a-f]{40}$/.test(manifest.commit ?? "")) fail("skills source must be pinned to a full 40-character commit SHA")
  const required = [
    "route-with-jev",
    "maintain-second-brain",
    "isolate-agent-runs",
    "run-software-factory",
    "enforce-with-hooks",
    "route-interrupts",
    "compress-token-spend",
    "adaptive-persona",
    "jev-gate",
  ]
  for (const skill of required) {
    if (!manifest.skills?.includes(skill)) fail(`missing required skill ${skill}`)
  }
}

if (!fs.existsSync(agentsPath)) {
  fail("missing AGENTS.md")
} else {
  const agents = fs.readFileSync(agentsPath, "utf8")
  if (!agents.includes("github.com/coden607/skills")) fail("AGENTS.md no longer points to coden607/skills")
  if (!agents.includes("scripts/bootstrap-agent-skills.sh")) fail("AGENTS.md must instruct agents to bootstrap the pinned shared skills")
}

if (!process.exitCode) console.log("agent-skills: pinned shared-skill integration is valid")
