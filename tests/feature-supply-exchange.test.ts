import assert from "node:assert/strict"
import { test } from "node:test"
import {
  canTransitionListing,
  cleanDescription,
  cleanLocationLabel,
  cleanQuantity,
  cleanTitle,
  isListingRef,
  isSupplyCondition,
  isSupplyKind,
  isSupplyProvenance,
  listingRef,
  roleFor,
  SUPPLY_QUANTITY_MAX,
  validateListingInput,
} from "../lib/supply-exchange"
import { isValidResourceRef } from "../lib/resource-moderation"

test("kind, condition, and provenance validators accept only known values", () => {
  assert.equal(isSupplyKind("naloxone-kit"), true)
  assert.equal(isSupplyKind("food"), false)
  assert.equal(isSupplyCondition("like-new"), true)
  assert.equal(isSupplyCondition("broken"), false)
  assert.equal(isSupplyProvenance("organization"), true)
  assert.equal(isSupplyProvenance("admin"), false)
})

test("titles are bounded and stripped of control characters", () => {
  assert.equal(cleanTitle("Narcan kit, unopened"), "Narcan kit, unopened")
  assert.equal(cleanTitle("ab"), null)
  assert.equal(cleanTitle("x".repeat(121)), null)
  assert.equal(cleanTitle("a\u0001b"), "a b")
})

test("descriptions reuse report detail bounds", () => {
  assert.equal(cleanDescription("Two kits from the community drive"), "Two kits from the community drive")
  assert.equal(cleanDescription(""), null)
  assert.equal(cleanDescription("x".repeat(2001)), null)
})

test("location labels reject raw coordinates in either order", () => {
  assert.equal(cleanLocationLabel("South Side, near the library"), "South Side, near the library")
  assert.equal(cleanLocationLabel("40.7128, -74.0060"), null)
  assert.equal(cleanLocationLabel("-74.0060, 40.7128"), null)
  assert.equal(cleanLocationLabel("ab"), null)
})

test("quantity is an integer within bounds", () => {
  assert.equal(cleanQuantity(1), 1)
  assert.equal(cleanQuantity(SUPPLY_QUANTITY_MAX), SUPPLY_QUANTITY_MAX)
  assert.equal(cleanQuantity(0), null)
  assert.equal(cleanQuantity(SUPPLY_QUANTITY_MAX + 1), null)
  assert.equal(cleanQuantity(1.5), null)
  assert.equal(cleanQuantity("3"), 3)
})

test("listingRef is a valid moderation resource reference", () => {
  const ref = listingRef("abc-123")
  assert.equal(ref, "supply:abc-123")
  assert.equal(isListingRef(ref), true)
  assert.equal(isValidResourceRef(ref), true)
  assert.equal(isListingRef("resource:xyz"), false)
})

test("roleFor resolves owner, claimant, member, and moderator", () => {
  const listing = { owner_id: "u1", claimed_by: "u2" as string | null }
  assert.equal(roleFor("u1", listing), "owner")
  assert.equal(roleFor("u2", listing), "claimant")
  assert.equal(roleFor("u3", listing), "member")
  assert.equal(roleFor("mod", listing, new Set(["mod"])), "moderator")
})

test("listing lifecycle: members claim, owners cannot claim their own", () => {
  assert.equal(canTransitionListing("open", "claimed", "member"), true)
  assert.equal(canTransitionListing("open", "claimed", "owner"), false)
  assert.equal(canTransitionListing("open", "claimed", "moderator"), false)
})

test("listing lifecycle: close and release paths", () => {
  assert.equal(canTransitionListing("open", "closed", "owner"), true)
  assert.equal(canTransitionListing("open", "closed", "moderator"), true)
  assert.equal(canTransitionListing("open", "closed", "member"), false)
  assert.equal(canTransitionListing("claimed", "open", "claimant"), true)
  assert.equal(canTransitionListing("claimed", "open", "owner"), true)
  assert.equal(canTransitionListing("claimed", "open", "member"), false)
  assert.equal(canTransitionListing("claimed", "closed", "claimant"), true)
})

test("closed is terminal and self-transitions are rejected", () => {
  assert.equal(canTransitionListing("closed", "open", "owner"), false)
  assert.equal(canTransitionListing("closed", "claimed", "moderator"), false)
  assert.equal(canTransitionListing("open", "open", "owner"), false)
})

test("validateListingInput passes a complete valid listing", () => {
  const result = validateListingInput({
    kind: "hygiene-pack",
    title: "Hygiene pack x2",
    description: "Sealed kits from the outreach table",
    condition: "new",
    quantity: 2,
    locationLabel: "Northside community center",
    provenance: "organization",
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.kind, "hygiene-pack")
    assert.equal(result.value.quantity, 2)
    assert.equal(result.value.provenance, "organization")
    assert.equal(result.value.condition, "new")
  }
})

test("validateListingInput defaults quantity, condition, and provenance", () => {
  const result = validateListingInput({
    kind: "transit-help",
    title: "Bus pass rides",
    description: "Can cover two fares this week",
    locationLabel: "Downtown",
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.value.quantity, 1)
    assert.equal(result.value.condition, null)
    assert.equal(result.value.provenance, "individual")
  }
})

test("validateListingInput names every failure", () => {
  const result = validateListingInput({
    kind: "money",
    title: "ab",
    description: "",
    quantity: 99,
    locationLabel: "40.1, -70.2",
  })
  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.equal(result.errors.length, 5)
    assert.ok(result.errors.some((e) => e.includes("kind")))
    assert.ok(result.errors.some((e) => e.includes("title")))
    assert.ok(result.errors.some((e) => e.includes("description")))
    assert.ok(result.errors.some((e) => e.includes("quantity")))
    assert.ok(result.errors.some((e) => e.includes("locationLabel")))
  }
})

test("validateListingInput rejects coordinate location labels", () => {
  const result = validateListingInput({
    kind: "charger",
    title: "Anker charger",
    description: "Working USB-C brick",
    locationLabel: "40.7128, -74.0060",
  })
  assert.equal(result.ok, false)
})
