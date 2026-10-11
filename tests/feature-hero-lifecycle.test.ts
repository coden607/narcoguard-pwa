import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  heroCanRelease,
  isHeroRequestStatus,
  nextHeroAction,
  requesterCanCancel,
  requesterStatusText,
} from "../lib/hero-lifecycle"

test("Hero request lifecycle has explicit forward actions", () => {
  assert.equal(nextHeroAction("accepted"), "en-route")
  assert.equal(nextHeroAction("en_route"), "arrive")
  assert.equal(nextHeroAction("arrived"), "complete")
  assert.equal(nextHeroAction("open"), null)
  assert.equal(nextHeroAction("completed"), null)
})

test("requesters can cancel active work but not terminal requests", () => {
  for (const status of ["open", "accepted", "en_route", "arrived"] as const) assert.equal(requesterCanCancel(status), true)
  assert.equal(requesterCanCancel("completed"), false)
  assert.equal(requesterCanCancel("cancelled"), false)
})

test("Heroes can release an assignment before arrival", () => {
  assert.equal(heroCanRelease("accepted"), true)
  assert.equal(heroCanRelease("en_route"), true)
  assert.equal(heroCanRelease("arrived"), false)
})

test("status parsing and copy cover every state", () => {
  for (const status of ["open","accepted","en_route","arrived","completed","cancelled"]) {
    assert.equal(isHeroRequestStatus(status), true)
    assert.ok(requesterStatusText(status as never).length > 0)
  }
  assert.equal(isHeroRequestStatus("expired"), false)
})
