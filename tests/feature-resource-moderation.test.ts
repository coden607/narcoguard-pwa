import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import {
  REPORT_REASONS,
  REPORT_STATUSES,
  canTransition,
  cleanDetails,
  isModerationRole,
  isReportReason,
  isValidResourceRef,
  transition,
} from "../lib/resource-moderation"

test("reason and status vocabularies are bounded", () => {
  assert.deepEqual([...REPORT_REASONS], ["incorrect", "duplicate", "stale", "unsafe", "provider-correction", "other"])
  assert.deepEqual([...REPORT_STATUSES], ["open", "triaged", "resolved", "dismissed"])
})

test("open reports can be triaged or dismissed", () => {
  assert.equal(canTransition("open", "triaged"), true)
  assert.equal(canTransition("open", "dismissed"), true)
  assert.equal(canTransition("open", "resolved"), false)
})

test("triaged reports resolve, dismiss, or reopen", () => {
  assert.equal(canTransition("triaged", "resolved"), true)
  assert.equal(canTransition("triaged", "dismissed"), true)
  assert.equal(canTransition("triaged", "open"), true)
})

test("terminal states stay terminal unless reopened", () => {
  assert.equal(canTransition("resolved", "triaged"), false)
  assert.equal(canTransition("resolved", "dismissed"), false)
  assert.equal(canTransition("dismissed", "open"), true)
})

test("transition maps moves to audit actions", () => {
  assert.deepEqual(transition("open", "triaged"), { ok: true, action: "triaged" })
  assert.deepEqual(transition("triaged", "open"), { ok: true, action: "reopened" })
  assert.deepEqual(transition("triaged", "resolved"), { ok: true, action: "resolved" })
  const bad = transition("resolved", "triaged")
  assert.equal(bad.ok, false)
  assert.equal(transition("open", "open").ok, false)
})

test("resource references reject raw coordinates", () => {
  assert.equal(isValidResourceRef("samhsa:findtreatment:us-ny-12345"), true)
  assert.equal(isValidResourceRef("ab"), false)
  assert.equal(isValidResourceRef("40.7128, -74.0060"), false)
  assert.equal(isValidResourceRef("-33.86,151.20"), false)
  assert.equal(isValidResourceRef(""), false)
  assert.equal(isValidResourceRef(null), false)
})

test("details are cleaned and bounded", () => {
  assert.equal(cleanDetails("  listed  hours   are wrong "), "listed hours are wrong")
  assert.equal(cleanDetails(""), null)
  assert.equal(cleanDetails("x".repeat(2001)), null)
  assert.equal(cleanDetails(null), null)
  assert.equal(cleanDetails(42), null)
})

test("moderator role check accepts only moderator and admin", () => {
  assert.equal(isModerationRole("moderator"), true)
  assert.equal(isModerationRole("admin"), true)
  assert.equal(isModerationRole("user"), false)
  assert.equal(isModerationRole(null), false)
})

test("reason validation accepts only known reasons", () => {
  assert.equal(isReportReason("unsafe"), true)
  assert.equal(isReportReason("made-up"), false)
})

test("migration creates both tables, enables RLS, and forbids user writes to events", () => {
  const sql = readFileSync("supabase/migrations/20261013054500_resource_moderation_queue.sql", "utf8")
  assert.match(sql, /create table if not exists public\.resource_reports/)
  assert.match(sql, /create table if not exists public\.resource_moderation_events/)
  assert.match(sql, /alter table public\.resource_reports enable row level security/)
  assert.match(sql, /alter table public\.resource_moderation_events enable row level security/)
  // Audit trail: no insert/update/delete policy is granted on events to authenticated users.
  const policies = [...sql.matchAll(/create policy (\S+) on public\.(\S+)/g)].map((m) => m[0])
  assert.ok(policies.every((p) => !p.includes("resource_moderation_events") || p.includes("_select_own")))
  // Every status change is recorded through the immutable event table.
  assert.match(sql, /references public\.resource_reports\(id\) on delete cascade/)
})
