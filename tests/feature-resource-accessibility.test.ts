import { strict as assert } from "node:assert"
import { test } from "node:test"
import { accessibilityDetails, accessibilityReport } from "../lib/resource-accessibility"

test("a wheelchair map tag never implies entrance, restroom, quiet-space or pet access", () => {
  const details = accessibilityDetails({ name: "Library", kind: "library", source: "OpenStreetMap contributors", wheelchair: "yes" })
  assert.equal(details.length, 4)
  assert.ok(details.every((item) => item.value === "Unknown" && item.source === null))
})
test("accessibility contribution requires field-specific provenance and observation date", () => {
  assert.equal(accessibilityReport({ field: "entrance", value: "yes", provenance: "", observedAt: "2026-10-17" }), null)
  assert.equal(accessibilityReport({ field: "pets", value: "yes", provenance: "Spoke with provider", observedAt: "2026-02-31" }), null)
  const report = accessibilityReport({ field: "quiet-space", value: "unknown", provenance: "Provider phone call", observedAt: "2026-10-17" })!
  assert.equal(report.reason, "incorrect")
  assert.match(report.details, /Unknown/)
  assert.match(report.details, /Provider phone call/)
})
