import assert from "node:assert/strict"
import { test } from "node:test"
import {
  approveContact,
  buildCircleView,
  circleAuditLog,
  CIRCLE_VIEW_LIMIT,
  publishSafeCheckIn,
  readSupportCircle,
  revokeContact,
  shareNudge,
  sharePlanItem,
  SUPPORT_CIRCLE_MAX_CONTACTS,
  unsharePlanItem,
  updateScopes,
} from "../lib/support-circle"

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void }

const memoryStorage = (): StorageLike => {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
  }
}

const ALL_SCOPES = ["preparedness-plan", "safe-checkins", "follow-through-nudges"] as const

test("unapproved contact gets no view at all", () => {
  const storage = memoryStorage()
  publishSafeCheckIn(storage, {}, "2026-10-14T08:00:00.000Z")
  assert.equal(buildCircleView(storage, "nobody"), null)
})

test("approved contact sees exactly the approved scopes", () => {
  const storage = memoryStorage()
  approveContact(storage, { id: "c1", name: "Rita", scopes: ["safe-checkins"] }, "2026-10-14T08:00:00.000Z")
  publishSafeCheckIn(storage, { note: "safe after appointment" }, "2026-10-14T09:00:00.000Z")
  sharePlanItem(storage, { label: "Naloxone kit refill" }, "2026-10-14T09:05:00.000Z")
  shareNudge(storage, { label: "Picked up transit pass" }, "2026-10-14T09:10:00.000Z")
  const view = buildCircleView(storage, "c1")!
  assert.equal(view.safeCheckIns.length, 1)
  assert.equal(view.safeCheckIns[0].note, "safe after appointment")
  assert.equal(view.sharedPlans.length, 0)
  assert.equal(view.followThroughNudges.length, 0)
})

test("circle view type exposes no predictions or need-history fields", () => {
  const storage = memoryStorage()
  approveContact(storage, { id: "c1", name: "Rita", scopes: [...ALL_SCOPES] }, "2026-10-14T08:00:00.000Z")
  publishSafeCheckIn(storage, {}, "2026-10-14T09:00:00.000Z")
  sharePlanItem(storage, { label: "Clinic visit" }, "2026-10-14T09:05:00.000Z")
  shareNudge(storage, { label: "Kit check" }, "2026-10-14T09:10:00.000Z")
  const view = buildCircleView(storage, "c1")!
  assert.deepEqual(Object.keys(view).sort(), ["contact", "followThroughNudges", "safeCheckIns", "sharedPlans"])
  const serialized = JSON.stringify(view)
  for (const forbidden of ["needs", "prediction", "cue", "calibration", "drift", "subgroup"]) {
    assert.equal(serialized.includes(forbidden), false, `view must not contain "${forbidden}"`)
  }
})

test("revoking a contact ends visibility immediately", () => {
  const storage = memoryStorage()
  approveContact(storage, { id: "c1", name: "Rita", scopes: ["safe-checkins"] }, "2026-10-14T08:00:00.000Z")
  publishSafeCheckIn(storage, {}, "2026-10-14T09:00:00.000Z")
  assert.equal(buildCircleView(storage, "c1")!.safeCheckIns.length, 1)
  const revoked = revokeContact(storage, "c1", "2026-10-14T10:00:00.000Z")
  assert.equal(revoked.ok, true)
  assert.equal(buildCircleView(storage, "c1"), null)
  assert.equal(readSupportCircle(storage).checkIns.length, 1)
})

test("narrowing a scope removes that part of the view right away", () => {
  const storage = memoryStorage()
  approveContact(storage, { id: "c1", name: "Rita", scopes: [...ALL_SCOPES] }, "2026-10-14T08:00:00.000Z")
  sharePlanItem(storage, { label: "Clinic visit" }, "2026-10-14T09:05:00.000Z")
  const full = buildCircleView(storage, "c1")!
  assert.equal(full.sharedPlans.length, 1)
  const updated = updateScopes(storage, "c1", ["safe-checkins"], "2026-10-14T10:00:00.000Z")
  assert.equal(updated.ok, true)
  const narrowed = buildCircleView(storage, "c1")!
  assert.equal(narrowed.sharedPlans.length, 0)
  assert.equal(narrowed.safeCheckIns.length, 0)
})

test("circle size is capped and duplicates and empty scopes are rejected", () => {
  const storage = memoryStorage()
  for (let i = 0; i < SUPPORT_CIRCLE_MAX_CONTACTS; i += 1) {
    const result = approveContact(storage, { id: `c${i}`, name: `Contact ${i}`, scopes: ["safe-checkins"] }, "2026-10-14T08:00:00.000Z")
    assert.equal(result.ok, true)
  }
  const overflow = approveContact(storage, { id: "cx", name: "Extra", scopes: ["safe-checkins"] }, "2026-10-14T08:00:00.000Z")
  assert.equal(overflow.ok, false)
  assert.match(overflow.reason, /full/)
  const duplicate = approveContact(storage, { id: "c0", name: "Again", scopes: ["safe-checkins"] }, "2026-10-14T08:00:00.000Z")
  assert.equal(duplicate.ok, false)
  assert.match(duplicate.reason, /already approved/)
  const empty = approveContact(storage, { id: "c9", name: "None", scopes: [] }, "2026-10-14T08:00:00.000Z")
  assert.equal(empty.ok, false)
})

test("check-in retention keeps the newest items bounded", () => {
  const storage = memoryStorage()
  for (let i = 0; i < 35; i += 1) {
    publishSafeCheckIn(storage, {}, `2026-10-${String(1 + (i % 28)).padStart(2, "0")}T${String(i % 24).padStart(2, "0")}:00:00.000Z`)
  }
  assert.equal(readSupportCircle(storage).checkIns.length, 30)
})

test("view is capped at the display limit even with more history", () => {
  const storage = memoryStorage()
  approveContact(storage, { id: "c1", name: "Rita", scopes: ["safe-checkins"] }, "2026-10-14T08:00:00.000Z")
  for (let i = 0; i < CIRCLE_VIEW_LIMIT + 5; i += 1) {
    publishSafeCheckIn(storage, {}, `2026-10-14T${String(8 + (i % 10)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00.000Z`)
  }
  const view = buildCircleView(storage, "c1")!
  assert.equal(view.safeCheckIns.length, CIRCLE_VIEW_LIMIT)
})

test("unsharePlanItem removes the item and logs it", () => {
  const storage = memoryStorage()
  approveContact(storage, { id: "c1", name: "Rita", scopes: ["preparedness-plan"] }, "2026-10-14T08:00:00.000Z")
  const item = sharePlanItem(storage, { label: "Clinic visit" }, "2026-10-14T09:05:00.000Z")
  assert.equal(buildCircleView(storage, "c1")!.sharedPlans.length, 1)
  assert.equal(unsharePlanItem(storage, item.id, "c1", "2026-10-14T10:00:00.000Z"), true)
  assert.equal(buildCircleView(storage, "c1")!.sharedPlans.length, 0)
  const log = circleAuditLog(storage, "c1")
  assert.equal(log[log.length - 1].action, "unshare-plan")
})

test("consent changes are audit-logged per contact", () => {
  const storage = memoryStorage()
  approveContact(storage, { id: "c1", name: "Rita", scopes: ["safe-checkins"] }, "2026-10-14T08:00:00.000Z")
  updateScopes(storage, "c1", ["safe-checkins", "preparedness-plan"], "2026-10-14T09:00:00.000Z")
  revokeContact(storage, "c1", "2026-10-14T10:00:00.000Z")
  const log = circleAuditLog(storage, "c1")
  assert.deepEqual(log.map((entry) => entry.action), ["approve", "scopes-updated", "revoke"])
  assert.match(log[1].detail, /added: preparedness-plan/)
})

test("shared item ids are unique across types and time", () => {
  const storage = memoryStorage()
  const a = publishSafeCheckIn(storage, {}, "2026-10-14T09:00:00.000Z")
  const b = publishSafeCheckIn(storage, {}, "2026-10-14T09:00:00.000Z")
  const plan = sharePlanItem(storage, { label: "x" }, "2026-10-14T09:00:00.000Z")
  assert.notEqual(a.id, b.id)
  assert.notEqual(a.id, plan.id)
})

test("corrupt stored state reads as empty rather than throwing", () => {
  const storage = memoryStorage()
  storage.setItem("narcoguard_support_circle_v1", "{broken")
  assert.equal(readSupportCircle(storage).contacts.length, 0)
})
