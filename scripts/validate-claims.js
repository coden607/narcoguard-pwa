const fs = require("node:fs")
const path = require("node:path")

const roots = ["app", "components", "marketing", "scripts", "README.md"]
const extensions = new Set([".js", ".mjs", ".ts", ".tsx", ".md"])
const forbidden = [
  /94%/i,
  /medical[- ]grade/i,
  /HIPAA[- ]compliant/i,
  /FDA Class II Medical Device/i,
  /automatically injects naloxone/i,
  /No human intervention required/i,
  /certification ready/i,
]

function filesIn(target) {
  if (!fs.existsSync(target)) return []
  if (fs.statSync(target).isFile()) return [target]
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) =>
    filesIn(path.join(target, entry.name)),
  )
}

const failures = []
for (const root of roots) {
  for (const file of filesIn(path.join(process.cwd(), root))) {
    if (!extensions.has(path.extname(file)) || file.endsWith("validate-claims.js")) continue
    const content = fs.readFileSync(file, "utf8")
    for (const pattern of forbidden) {
      if (pattern.test(content)) failures.push(`${path.relative(process.cwd(), file)} matches ${pattern}`)
    }
  }
}

if (failures.length) {
  console.error("[claims] unsupported public claim(s) found")
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log("[claims] public and generated content passed the unsupported-claim scan")
