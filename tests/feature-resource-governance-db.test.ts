import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

// PostgreSQL test engine is a development dependency; an absent engine must fail the gate.
const engine = "@electric-sql/pglite"

test("governance migration enforces private ownership, verification, independent appeals, alias undo and rate limits in PostgreSQL", async () => {
  const { PGlite } = await import(engine)
  const db = new PGlite()
  const owner = "00000000-0000-0000-0000-000000000001"
  const other = "00000000-0000-0000-0000-000000000002"
  const mod = "00000000-0000-0000-0000-000000000003"
  const independent = "00000000-0000-0000-0000-000000000004"
  try {
    await db.exec(`create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated; create role service_role bypassrls; create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; insert into auth.users values ('${owner}'),('${other}'),('${mod}'),('${independent}');`)
    await db.exec(readFileSync("supabase/migrations/20261013054500_resource_moderation_queue.sql", "utf8"))
    const migration = readFileSync("supabase/migrations/20261017203644_resource_governance_review.sql", "utf8")
    await db.exec("begin")
    await db.exec(migration)
    await db.exec("rollback")
    assert.equal((await db.query("select to_regclass('public.resource_reviews') as name")).rows[0].name, null)
    await db.exec(migration)
    await db.exec(`insert into resource_reviewers(user_id) values ('${mod}'),('${independent}');`)
    await db.exec("set role service_role")
    const rpc = async (operation: string, payload: Record<string, unknown>) => {
      const res = await db.query("select resource_governance($1,$2::jsonb) as value", [operation, JSON.stringify(payload)])
      return res.rows[0].value
    }
    const submitted = await rpc("submit", { actor: owner, kind: "correction", resourceRef: "provider:1", text: "Corrected hours", sourceUrl: "https://provider.test/hours" })
    await assert.rejects(rpc("decide", { actor: owner, kind: "correction", id: submitted.id, action: "verify", reason: "I claim identity" }))
    await assert.rejects(rpc("decide", { actor: mod, kind: "correction", id: submitted.id, action: "publish", reason: "Unchecked" }))
    assert.equal((await rpc("public", { resourceRef: "provider:1" })).corrections.length, 0)
    await rpc("decide", { actor: mod, kind: "correction", id: submitted.id, action: "verify", reason: "Called independently sourced provider contact; identity verified" })
    await rpc("decide", { actor: mod, kind: "correction", id: submitted.id, action: "publish", reason: "Provider evidence checked" })
    const published = await rpc("public", { resourceRef: "provider:1" })
    assert.equal(published.corrections[0].proposed_text, "Corrected hours")
    assert.equal(JSON.stringify(published).includes(owner), false)
    assert.equal(JSON.stringify(published).includes("Called independently"), false)
    assert.equal((await rpc("list", { actor: other, kind: "correction" })).items.length, 0)
    await assert.rejects(rpc("list", { actor: other, kind: "correction", queue: true }))
    const duplicate = await rpc("submit", { actor: owner, kind: "duplicate", resourceRef: "source:2", targetRef: "provider:1", text: "Same provider", sourceUrl: "https://directory.test/2" })
    await rpc("decide", { actor: mod, kind: "duplicate", id: duplicate.id, action: "publish", reason: "Both sources checked" })
    assert.equal((await rpc("public", { resourceRef: "source:2" })).canonicalRef, "provider:1")
    assert.equal((await rpc("public", { resourceRef: "source:2" })).aliases[0].source_urls[0], "https://directory.test/2")
    const reverse = await rpc("submit", { actor: other, kind: "duplicate", resourceRef: "provider:1", targetRef: "source:2", text: "Reverse alias", sourceUrl: "https://provider.test" })
    await assert.rejects(rpc("decide", { actor: mod, kind: "duplicate", id: reverse.id, action: "publish", reason: "Cycle" }))
    await rpc("decide", { actor: mod, kind: "duplicate", id: duplicate.id, action: "undo", reason: "Found distinct services" })
    assert.equal((await rpc("public", { resourceRef: "source:2" })).canonicalRef, "source:2")
    const observedAt = "2026-10-16T13:30:00Z"
    const reportResult = await db.query("select resource_report_submit($1,'provider:1','incorrect','Observed closed',$2::jsonb) as value", [owner, JSON.stringify({ observed_at: observedAt, observed_timezone: "America/New_York", observed_hours: "Closed at posted opening" })])
    const reportId = reportResult.rows[0].value.id
    const storedObservation = (await db.query("select observed_timezone,observed_hours from resource_reports where id=$1", [reportId])).rows[0]
    assert.deepEqual(storedObservation, { observed_timezone: "America/New_York", observed_hours: "Closed at posted opening" })
    assert.equal((await db.query("select action from resource_moderation_events where report_id=$1", [reportId])).rows[0].action, "submitted")
    await db.query("select resource_report_decide($1,$2,'dismissed','Evidence insufficient')", [mod, reportId])
    await assert.rejects(rpc("submit", { actor: other, kind: "appeal", parentId: reportId, text: "Not mine" }))
    const appeal = await rpc("submit", { actor: owner, kind: "appeal", parentId: reportId, text: "Please review source evidence" })
    await assert.rejects(rpc("decide", { actor: mod, kind: "appeal", id: appeal.id, action: "uphold", reason: "My own decision" }))
    await db.query("select resource_report_decide($1,$2,'open','New evidence')", [independent, reportId])
    await db.query("select resource_report_decide($1,$2,'dismissed','A replacement decision')", [independent, reportId])
    await assert.rejects(rpc("decide", { actor: mod, kind: "appeal", id: appeal.id, action: "uphold", reason: "Trying to review my superseded decision" }))
    await assert.rejects(rpc("decide", { actor: independent, kind: "appeal", id: appeal.id, action: "overturn", reason: "Stale appeal must not alter replacement decision" }))
    assert.equal((await rpc("list", { actor: owner, kind: "appeal" })).items[0].status, "superseded")
    await db.query("select resource_report_decide($1,$2,'open','Fresh review')", [mod, reportId])
    await db.query("select resource_report_decide($1,$2,'dismissed','Evidence insufficient')", [mod, reportId])
    const freshAppeal = await rpc("submit", { actor: owner, kind: "appeal", parentId: reportId, text: "Please review current decision" })
    await rpc("decide", { actor: independent, kind: "appeal", id: freshAppeal.id, action: "overturn", reason: "Independent evidence warrants reopening" })
    assert.equal((await db.query("select status from resource_reports where id=$1", [reportId])).rows[0].status, "open")
    const ownStatus = await rpc("list", { actor: owner, kind: "appeal" })
    assert.equal(ownStatus.items[0].status, "overturned")
    assert.equal(ownStatus.items[0].decision_reason, "Independent evidence warrants reopening")
    for (let i = 0; i < 4; i++) await db.query("insert into resource_reports(resource_ref,reporter_id,reason,details) values ('provider:1',$1,'incorrect','Hours')", [owner])
    await assert.rejects(db.query("insert into resource_reports(resource_ref,reporter_id,reason,details) values ('provider:1',$1,'incorrect','Limit')", [owner]), /rate limit/)
    await db.exec("set role authenticated")
    await assert.rejects(db.query("select resource_governance('list',$1::jsonb)", [JSON.stringify({ actor: mod, kind: "correction", queue: true })]), /permission denied/)
    await assert.rejects(db.query("select * from resource_reviews"), /permission denied/)
    await db.exec("reset role")
    await db.exec(`grant usage on schema auth to authenticated; grant execute on function auth.uid() to authenticated; set role authenticated; select set_config('request.jwt.claim.sub','${other}',false);`)
    assert.equal((await db.query("select id from resource_reports where id=$1", [reportId])).rows.length, 0)
    await assert.rejects(db.query("insert into resource_reports(resource_ref,reporter_id,reason,details,status,decided_by) values ('fake:1',$1,'incorrect','Forged decision','dismissed',$2)", [other, mod]))
    await db.exec(`select set_config('request.jwt.claim.sub','${owner}',false)`)
    assert.equal((await db.query("select id from resource_reports where id=$1", [reportId])).rows.length, 1)
    await db.exec("reset role")
  } finally { await db.close() }
})
