const fs = require("node:fs")
const path = require("node:path")

const migrationDir = path.join(process.cwd(), "supabase", "migrations")
const migrations = fs
  .readdirSync(migrationDir)
  .filter((file) => file.endsWith(".sql"))
  .sort()
  .map((file) => fs.readFileSync(path.join(migrationDir, file), "utf8"))
  .join("\n")

const requiredTables = [
  "users",
  "vitals_readings",
  "emergencies",
  "heroes",
  "emergency_responses",
  "locations",
  "watches",
  "donations",
  "activity_log",
  "legal_agreements",
  "emergency_contacts",
]

const requiredChecks = [
  ["auth identity mapping", /auth_user_id\s+uuid\s+references\s+auth\.users/i],
  ["ownership helper", /create or replace function\s+public\.current_app_user_id/i],
  ["users RLS", /alter table public\.users enable row level security/i],
  ["vitals RLS", /alter table public\.vitals_readings enable row level security/i],
  ["emergency RLS", /alter table public\.emergencies enable row level security/i],
  ["service-only donations", /Donations and activity logs contain administrative/i],
]

const failures = []
for (const table of requiredTables) {
  if (!new RegExp(`create table if not exists ${table}\\b`, "i").test(migrations)) {
    failures.push(`missing table definition: ${table}`)
  }
}
for (const [name, pattern] of requiredChecks) {
  if (!pattern.test(migrations)) failures.push(`missing ${name}`)
}

const policyCount = (migrations.match(/create policy\b/gi) || []).length
if (policyCount < 18) failures.push(`expected at least 18 explicit RLS policies, found ${policyCount}`)

if (failures.length) {
  console.error("[supabase] migration validation failed")
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`[supabase] migration validation passed (${requiredTables.length} tables, ${policyCount} policies)`)
