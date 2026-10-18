import assert from "node:assert/strict"
import { test } from "node:test"
import { governanceHandler, type GovernanceDependencies } from "../lib/resource-corrections-api"

function fixture(user = "owner", moderator = false) {
  const calls: { operation: string; payload: Record<string, unknown> }[] = []
  const deps: GovernanceDependencies = {
    authenticate: async () => user ? { id: user } : null,
    execute: async (operation, payload) => {
      calls.push({ operation, payload })
      if (operation === "list") return new Response(JSON.stringify({ items: [] }))
      if (operation === "public") return new Response(JSON.stringify({ canonicalRef: payload.resourceRef, corrections: [] }))
      if (operation === "decide" && !moderator) return new Response(JSON.stringify({ error: "Reviewer required" }), { status: 403 })
      return new Response(JSON.stringify({ id: "review-1", status: "pending" }))
    },
  }
  const request = (body: unknown, method = "POST") => new Request("https://ng.test/api/resources/corrections", { method, headers: { Origin: "https://ng.test", "Content-Type": "application/json" }, body: JSON.stringify(body) })
  return { calls, deps, request }
}

test("correction submission never trusts claimed verification or actor", async () => {
  const f = fixture()
  const response = await governanceHandler("correction", f.request({ resourceRef: "provider:123", text: "Hours corrected", sourceUrl: "https://provider.test/hours", verified: true, actor: "other" }), f.deps)
  assert.equal(response.status, 201)
  assert.deepEqual(f.calls[0].payload, { actor: "owner", kind: "correction", resourceRef: "provider:123", text: "Hours corrected", sourceUrl: "https://provider.test/hours", targetRef: null, parentId: null })
})

test("appeals and private status require authentication", async () => {
  const f = fixture("")
  assert.equal((await governanceHandler("appeal", f.request({ parentId: "abc", text: "Please review" }), f.deps)).status, 401)
  assert.equal((await governanceHandler("appeal", new Request("https://ng.test/api/resources/appeals"), f.deps)).status, 401)
  assert.equal(f.calls.length, 0)
})

test("private listing binds actor server-side and returns no other identity", async () => {
  const f = fixture("owner")
  const response = await governanceHandler("appeal", new Request("https://ng.test/api/resources/appeals?actor=other"), f.deps)
  assert.equal(response.status, 200)
  assert.deepEqual(f.calls[0].payload, { actor: "owner", kind: "appeal", queue: false })
})

test("duplicate requests require distinct scoped references and source evidence", async () => {
  const f = fixture()
  const response = await governanceHandler("duplicate", f.request({ resourceRef: "source:1", targetRef: "source:1", text: "Same place", sourceUrl: "https://source.test" }), f.deps)
  assert.equal(response.status, 400)
  assert.equal(f.calls.length, 0)
})

test("moderator failure and unavailable schema are explicit", async () => {
  const f = fixture()
  const response = await governanceHandler("correction", f.request({ id: "abc", action: "publish", reason: "checked" }, "PATCH"), f.deps)
  assert.equal(response.status, 403)
  f.deps.execute = async () => new Response('{"code":"PGRST202"}', { status: 404 })
  const unavailable = await governanceHandler("correction", new Request("https://ng.test/api/resources/corrections?resourceRef=source:1"), f.deps)
  assert.equal(unavailable.status, 503)
})

test("cross origin and malformed evidence never reach storage", async () => {
  const f = fixture()
  const cross = new Request("https://ng.test/api/resources/corrections", { method: "POST", headers: { origin: "https://attacker.test" }, body: "{}" })
  assert.equal((await governanceHandler("correction", cross, f.deps)).status, 403)
  assert.equal((await governanceHandler("correction", f.request({ resourceRef: "source:1", text: "hi", sourceUrl: "javascript:alert(1)" }), f.deps)).status, 400)
})

test("hours observations require a timestamp with offset and explicit timezone", async () => {
  const { hoursObservation } = await import("../lib/resource-moderation")
  assert.equal(hoursObservation({ observedAt: "2026-10-17T09:30", observedTimezone: "America/New_York", observedHours: "Closed" }), null)
  assert.equal(hoursObservation({ observedAt: "2099-01-01T09:30:00Z", observedTimezone: "UTC", observedHours: "Closed" }), null)
  assert.deepEqual(hoursObservation({ observedAt: "2026-10-16T09:30:00-04:00", observedTimezone: "America/New_York", observedHours: "Closed at posted opening time" }), { observed_at: "2026-10-16T13:30:00.000Z", observed_timezone: "America/New_York", observed_hours: "Closed at posted opening time" })
})
