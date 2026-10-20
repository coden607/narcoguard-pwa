const fs = require("node:fs")
const path = require("node:path")

const root = path.join(__dirname, "..")
const inventoryPath = path.join(root, ".env.example")
const variants = [".env.development.example", ".env.preview.example", ".env.production.example"]
const ignoredRuntimeVariables = new Set([
  "CI", "FORCE_DAY", "GRANT_TYPE", "NEXT_DIST_DIR", "NODE_ENV", "PWA_BROWSER",
  "APPLICANT_NAME", "APPLICANT_EMAIL", "COMPANY_NAME", "DOS_ID", "SAMHSA_EMAIL",
  "OASAS_EMAIL", "STAP_EMAIL", "GOFUNDME_URL",
  "GITHUB_EVENT_PATH", "GITHUB_EVENT_NAME", "GITHUB_REPOSITORY", "GITHUB_ACTOR",
  // Set by the Vercel platform on every build and runtime; never configured by hand.
  "VERCEL", "VERCEL_ENV", "VERCEL_GIT_COMMIT_SHA", "VERCEL_DEPLOYMENT_ID",
])

const variableNames = (contents) => new Set(
  contents.split(/\r?\n/)
    .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=/)?.[1])
    .filter(Boolean),
)

const inventory = variableNames(fs.readFileSync(inventoryPath, "utf8"))
const failures = []

for (const relativePath of variants) {
  const names = variableNames(fs.readFileSync(path.join(root, relativePath), "utf8"))
  for (const name of names) {
    if (!inventory.has(name)) failures.push(`${relativePath}: ${name} is missing from .env.example`)
  }
}

const sourceFiles = []
const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".next", ".next-pwa-smoke", "node_modules"].includes(entry.name)) continue
    const absolute = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(absolute)
    else if (/\.(?:js|mjs|ts|tsx)$/.test(entry.name)) sourceFiles.push(absolute)
  }
}
walk(root)

for (const file of sourceFiles) {
  const source = fs.readFileSync(file, "utf8")
  for (const match of source.matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)) {
    const name = match[1]
    if (!inventory.has(name) && !ignoredRuntimeVariables.has(name)) {
      failures.push(`${path.relative(root, file)}: ${name} is missing from .env.example`)
    }
  }
}


const uhsNames = [
  "UHS_SMART_CLIENT_ID",
  "UHS_SMART_AUTH_URL",
  "UHS_SMART_TOKEN_URL",
  "UHS_FHIR_BASE_URL",
  "UHS_SMART_SESSION_SECRET",
]
const configuredUhs = uhsNames.filter((name) => Boolean(process.env[name]?.trim()))
if (configuredUhs.length > 0 && configuredUhs.length !== uhsNames.length) {
  failures.push(`UHS SMART configuration is partial; set all of: ${uhsNames.join(", ")}`)
}
if (configuredUhs.length === uhsNames.length) {
  for (const name of ["UHS_SMART_AUTH_URL", "UHS_SMART_TOKEN_URL", "UHS_FHIR_BASE_URL"]) {
    try {
      const url = new URL(process.env[name])
      if (url.protocol !== "https:") failures.push(`${name} must use https`)
    } catch {
      failures.push(`${name} must be a valid absolute URL`)
    }
  }
  if ((process.env.UHS_SMART_SESSION_SECRET || "").length < 32) {
    failures.push("UHS_SMART_SESSION_SECRET must be at least 32 characters")
  }
}

const secretPattern = /(?:KEY|TOKEN|SECRET|PASSWORD|DATABASE_URL|POSTGRES_URL|ACCOUNT_SID)$/
for (const name of inventory) {
  if (name.startsWith("NEXT_PUBLIC_") && secretPattern.test(name)) {
    failures.push(`.env.example: ${name} looks secret but is exposed to browser bundles`)
  }
}

if (failures.length) {
  console.error("[env] validation failed")
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(`[env] validation passed (${inventory.size} variables, ${variants.length} variants)`)
