import assert from "node:assert/strict"
import { test } from "node:test"
import { cleanPlanning, kitCheckFreshness } from "../lib/planning-private"

test("kit journal keeps unknown checked dates instead of inventing today", () => {
  const state = cleanPlanning({
    consentId: "consent",
    kits: [{ id: "kit-1", label: "Backpack", checked: "", expiry: "" }],
  })
  assert.deepEqual(state.kits, [{ id: "kit-1", label: "Backpack", checked: "", expiry: "" }])
  assert.equal(kitCheckFreshness("", "2026-10-19"), "unknown")
})

test("kit journal rejects impossible calendar dates", () => {
  const state = cleanPlanning({
    consentId: "consent",
    kits: [
      { id: "kit-1", label: "Glovebox", checked: "2026-13-01", expiry: "2026-02-31" },
      { id: "kit-2", label: "Bedside", checked: "2026-10-19", expiry: "2027-01-01" },
    ],
  })
  assert.equal(state.kits[0].checked, "")
  assert.equal(state.kits[0].expiry, "")
  assert.equal(state.kits[1].checked, "2026-10-19")
  assert.equal(state.kits[1].expiry, "2027-01-01")
})

test("kit freshness describes only the age of the user's last location check", () => {
  assert.equal(kitCheckFreshness("2026-10-19", "2026-10-19"), "recent")
  assert.equal(kitCheckFreshness("2026-07-01", "2026-10-19"), "stale")
  assert.equal(kitCheckFreshness("2026-10-20", "2026-10-19"), "unknown")
})
