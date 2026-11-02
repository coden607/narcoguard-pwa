import assert from "node:assert/strict"
import { existsSync } from "node:fs"
import { test } from "node:test"
import { CONTENT_PROVENANCE, REVIEW_DUE_MONTHS, monthsSince } from "../lib/content-provenance"

// Pages that show clinical or safety guidance. A new one must be added here and to the registry.
const SAFETY_PAGES = ["/ar", "/bystander", "/911-script", "/aftercare", "/rescue-breathing", "/wound-care", "/naloxone-card", "/debrief", "/safer-use", "/treatment", "/prevention"]

test("every safety page has a provenance entry for a page that exists", () => {
  for (const route of SAFETY_PAGES) {
    assert.ok(CONTENT_PROVENANCE[route], `${route} has no entry in lib/content-provenance.ts`)
    assert.ok(existsSync(`app${route}/page.tsx`), `app${route}/page.tsx does not exist`)
  }
})

test("each entry has a linked https source and a real, past review date", () => {
  for (const [route, entry] of Object.entries(CONTENT_PROVENANCE)) {
    assert.ok(entry.sources.some((source) => source.url?.startsWith("https://")), `${route} has no linked https source`)
    const months = monthsSince(entry.reviewed)
    assert.ok(Number.isFinite(months), `${route} review date "${entry.reviewed}" is not a valid YYYY-MM-DD date`)
    assert.ok(months >= 0, `${route} review date ${entry.reviewed} is in the future`)
  }
})

test("reviews older than a year are flagged (warning, not a failure)", (t) => {
  const due = Object.entries(CONTENT_PROVENANCE).filter(([, entry]) => monthsSince(entry.reviewed) >= REVIEW_DUE_MONTHS)
  for (const [route, entry] of due) t.diagnostic(`REVIEW DUE: ${route} last reviewed ${entry.reviewed}`)
  if (due.length) console.warn(`Safety content review due for: ${due.map(([route]) => route).join(", ")}`)
})

test("monthsSince counts whole months and rejects bad dates", () => {
  const today = new Date("2027-11-02T12:00:00Z")
  assert.equal(monthsSince("2026-11-02", today), 12)
  assert.equal(monthsSince("2026-11-03", today), 11)
  assert.ok(Number.isNaN(monthsSince("2026-02-30", today)))
  assert.ok(Number.isNaN(monthsSince("Nov 2026", today)))
})
