import { strict as assert } from "node:assert"
import { test } from "node:test"
import {
  cardSummary,
  freshnessLine,
  hoursLine,
  openNowChip,
  servicesLine,
  unknownFieldLine,
  wheelchairLine,
} from "../lib/resource-display"
import type { NearbyResource } from "../lib/resource-finder"

// Fixed reference times (local): 2026-10-06 is a Tuesday, 2026-10-11 is a Sunday.
const TUE = (time: string) => new Date(`2026-10-06T${time}:00`)
const SUN = (time: string) => new Date(`2026-10-11T${time}:00`)

const resource = (overrides: Partial<NearbyResource> = {}): NearbyResource => ({
  name: "Community Pantry",
  kind: "food",
  source: "OpenStreetMap contributors",
  ...overrides,
})

test("openNowChip reports open inside the listed window", () => {
  assert.deepEqual(openNowChip(resource({ hours: "Mo-Fr 09:00-17:00" }), TUE("10:00")), { label: "Open now", tone: "open" })
})

test("openNowChip reports closed outside the listed window and on unlisted days", () => {
  assert.deepEqual(openNowChip(resource({ hours: "Mo-Fr 09:00-17:00" }), TUE("18:00")), { label: "Closed now", tone: "closed" })
  assert.deepEqual(openNowChip(resource({ hours: "Mo-Fr 09:00-17:00" }), SUN("10:00")), { label: "Closed now", tone: "closed" })
})

test("openNowChip treats a 24/7 listing as open", () => {
  assert.deepEqual(openNowChip(resource({ hours: "24/7" }), TUE("03:00")), { label: "Open now", tone: "open" })
  assert.deepEqual(openNowChip(resource({ hours: "24/7" }), SUN("23:59")), { label: "Open now", tone: "open" })
})

test("openNowChip reports unknown when hours are absent or blank", () => {
  assert.deepEqual(openNowChip(resource()), { label: "Hours unknown", tone: "unknown" })
  assert.deepEqual(openNowChip(resource({ hours: "   " })), { label: "Hours unknown", tone: "unknown" })
})

test("openNowChip reports unknown when no reference time is injected", () => {
  assert.deepEqual(openNowChip(resource({ hours: "Mo-Fr 09:00-17:00" })), { label: "Hours unknown", tone: "unknown" })
})

test("openNowChip reports unknown for hours outside the supported subset", () => {
  assert.deepEqual(openNowChip(resource({ hours: "sunrise-sunset" }), TUE("10:00")), { label: "Hours unknown", tone: "unknown" })
  assert.deepEqual(openNowChip(resource({ hours: "Mo-Fr 09:00-17:00; PH off" }), TUE("10:00")), { label: "Hours unknown", tone: "unknown" })
})

test("openNowChip sends treatment listings to the phone instead of guessing hours", () => {
  const chip = openNowChip(resource({ kind: "treatment", source: "SAMHSA FindTreatment.gov", services: "Outpatient; Payment assistance" }))
  assert.deepEqual(chip, { label: "Hours unknown — call first", tone: "unknown" })
})

test("openNowChip says call first when services exist without hours, but not when hours are listed", () => {
  assert.deepEqual(openNowChip(resource({ services: "Outpatient; Payment assistance" })), { label: "Hours unknown — call first", tone: "unknown" })
  assert.deepEqual(openNowChip(resource({ hours: "Mo-Fr 09:00-17:00", services: "Outpatient" }), TUE("10:00")), { label: "Open now", tone: "open" })
})

test("hoursLine humanizes listed hours", () => {
  assert.equal(hoursLine(resource({ hours: "Mo-Fr 09:00-17:00" }), TUE("10:00")), "Mon–Fri 9 AM–5 PM")
})

test("hoursLine reads Open 24/7 for a 24/7 listing", () => {
  assert.equal(hoursLine(resource({ hours: "24/7" }), TUE("03:00")), "Open 24/7")
  assert.equal(hoursLine(resource({ hours: "24/7" })), "Open 24/7")
})

test("hoursLine is null when hours are absent", () => {
  assert.equal(hoursLine(resource()), null)
  assert.equal(hoursLine(resource({ hours: "" })), null)
})

test("hoursLine is null for hours outside the supported subset, never raw map text", () => {
  assert.equal(hoursLine(resource({ hours: "PH off" }), TUE("10:00")), null)
  assert.equal(hoursLine(resource({ hours: "Mo-Fr 09:00-17:00; PH off" })), null)
})

test("hoursLine humanizes parseable hours even without a reference time", () => {
  assert.equal(hoursLine(resource({ hours: "Sa,Su 10:00-14:00" })), "Sat–Sun 10 AM–2 PM")
})

test("freshnessLine names the month and year of the map edit", () => {
  assert.equal(freshnessLine(resource({ lastUpdated: "2024-05-17" })), "Map data from May 2024")
  assert.equal(freshnessLine(resource({ lastUpdated: "2023-12-01" })), "Map data from December 2023")
})

test("freshnessLine is null when the edit date is absent or not a calendar date", () => {
  assert.equal(freshnessLine(resource()), null)
  assert.equal(freshnessLine(resource({ lastUpdated: "" })), null)
  assert.equal(freshnessLine(resource({ lastUpdated: "not-a-date" })), null)
  assert.equal(freshnessLine(resource({ lastUpdated: "2024-13-01" })), null)
  assert.equal(freshnessLine(resource({ lastUpdated: "17 May 2024" })), null)
})

test("wheelchairLine reports the map tag in map-data terms", () => {
  assert.equal(wheelchairLine(resource({ wheelchair: "yes" })), "Wheelchair accessible per map data")
  assert.equal(wheelchairLine(resource({ wheelchair: "limited" })), "Limited wheelchair access per map data")
  assert.equal(wheelchairLine(resource({ wheelchair: "no" })), "Not marked wheelchair accessible in map data")
  assert.equal(wheelchairLine(resource()), null)
})

test("servicesLine passes the listing's services text through", () => {
  assert.equal(servicesLine(resource({ services: "Outpatient; Payment assistance" })), "Outpatient; Payment assistance")
  assert.equal(servicesLine(resource({ services: "Naloxone; counseling" })), "Naloxone; counseling")
})

test("servicesLine is null when no services are listed", () => {
  assert.equal(servicesLine(resource()), null)
  assert.equal(servicesLine(resource({ services: "  " })), null)
})

test("long lines are capped at 200 characters", () => {
  const longServices = `${"a".repeat(199)}${"b".repeat(50)}`
  const line = servicesLine(resource({ services: longServices }))
  assert.equal(line?.length, 200)
  assert.ok(unknownFieldLine("phone", resource()) !== null)
})

test("unknownFieldLine flags a missing phone and stays silent when one is listed", () => {
  assert.equal(unknownFieldLine("phone", resource()), "No phone listed in public data — try the map link")
  assert.equal(unknownFieldLine("phone", resource({ phone: "  " })), "No phone listed in public data — try the map link")
  assert.equal(unknownFieldLine("phone", resource({ phone: "518-555-0100" })), null)
})

test("unknownFieldLine flags a missing address and stays silent when one is listed", () => {
  assert.equal(unknownFieldLine("address", resource()), "Address not in public data — check the map link")
  assert.equal(unknownFieldLine("address", resource({ address: "1 Main St, Albany, NY" })), null)
})

test("unknownFieldLine omits a missing website entirely", () => {
  assert.equal(unknownFieldLine("website", resource()), null)
  assert.equal(unknownFieldLine("website", resource({ website: "https://pantry.example/" })), null)
})

test("cardSummary composes every line for a fully listed place", () => {
  const summary = cardSummary(resource({
    hours: "Mo-Fr 09:00-17:00",
    lastUpdated: "2024-05-17",
    wheelchair: "yes",
    phone: "518-555-0100",
    address: "1 Main St",
    website: "https://pantry.example/",
  }), TUE("10:00"))
  assert.deepEqual(summary, {
    chip: { label: "Open now", tone: "open" },
    hours: "Mon–Fri 9 AM–5 PM",
    freshness: "Map data from May 2024",
    wheelchair: "Wheelchair accessible per map data",
    services: null,
    unknowns: [],
  })
})

test("cardSummary collects the unknown contact fields and omits the website", () => {
  const summary = cardSummary(resource({ hours: "24/7" }), TUE("03:00"))
  assert.deepEqual(summary.chip, { label: "Open now", tone: "open" })
  assert.equal(summary.hours, "Open 24/7")
  assert.equal(summary.freshness, null)
  assert.equal(summary.wheelchair, null)
  assert.equal(summary.services, null)
  assert.deepEqual(summary.unknowns, [
    "No phone listed in public data — try the map link",
    "Address not in public data — check the map link",
  ])
})

test("every helper tolerates an empty resource object without throwing", () => {
  const empty = {} as NearbyResource
  assert.doesNotThrow(() => {
    assert.deepEqual(openNowChip(empty), { label: "Hours unknown", tone: "unknown" })
    assert.equal(hoursLine(empty), null)
    assert.equal(freshnessLine(empty), null)
    assert.equal(wheelchairLine(empty), null)
    assert.equal(servicesLine(empty), null)
    assert.equal(unknownFieldLine("phone", empty), "No phone listed in public data — try the map link")
    assert.equal(unknownFieldLine("address", empty), "Address not in public data — check the map link")
    assert.equal(unknownFieldLine("website", empty), null)
    const summary = cardSummary(empty)
    assert.equal(summary.chip.tone, "unknown")
    assert.equal(summary.hours, null)
    assert.deepEqual(summary.unknowns, [
      "No phone listed in public data — try the map link",
      "Address not in public data — check the map link",
    ])
  })
})
