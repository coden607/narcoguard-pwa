import assert from "node:assert/strict"
import { test } from "node:test"
import { parseAccountBackup, signOutAccount } from "../lib/account-client"

test("logout succeeds only when the server confirms session removal", async () => {
  await assert.rejects(signOutAccount(async () => { throw new Error("offline") }), /Could not reach/)
  await assert.rejects(signOutAccount(async () => Response.json({ error: "Try again" }, { status: 503 })), /Try again/)
  await assert.rejects(signOutAccount(async () => Response.json({})), /not confirmed/)
  await assert.doesNotReject(signOutAccount(async () => Response.json({ success: true })))
})

test("damaged backup contents are rejected before any device data is replaced", () => {
  for (const value of [null, {}, { v: 1, contacts: null }, { v: 1, savedAt: "invalid", contacts: { senderName: "", contacts: [] }, preferences: {} }]) {
    assert.equal(parseAccountBackup(value), null)
  }
  const savedAt = "2026-11-12T12:00:00.000Z"
  const broken = { v: 1, savedAt, contacts: { senderName: "Test", contacts: [null] }, preferences: {} }
  assert.equal(parseAccountBackup(broken), null)
  const valid = { v: 1, savedAt, contacts: { senderName: "Test", contacts: [] }, preferences: { name: "Test", legal: {} } }
  const backup = parseAccountBackup(valid)
  assert.equal(backup?.preferences.name, "Test")
  assert.equal(backup?.preferences.legal.acceptedTerms, false)
})
