import { strict as assert } from "node:assert"
import { test } from "node:test"
import { coarsen, fallbackLinks, findTreatmentUrl, haversineMiles, overpassQuery, parseFindTreatment, parseOverpass } from "../lib/resource-finder"

test("coordinates are coarsened to about 1 km before leaving the server", () => {
  assert.equal(coarsen(40.748817), 40.75)
  assert.equal(coarsen(-73.985428), -73.99)
})

test("haversine distance is in miles", () => {
  assert.equal(haversineMiles(40.75, -73.99, 40.75, -73.99), 0)
  const nycToPhilly = haversineMiles(40.7128, -74.006, 39.9526, -75.1652)
  assert.ok(nycToPhilly > 79 && nycToPhilly < 82, String(nycToPhilly))
})

test("overpass queries search only the requested kind around the point", () => {
  const query = overpassQuery("shelter", 40.75, -73.99)
  assert.match(query, /social_facility"="shelter"\]\(around:16000,40.75,-73.99\)/)
  assert.doesNotMatch(query, /pharmacy|food_bank/)
})

test("OpenStreetMap results need a name and position, are de-duplicated, sorted by distance and sanitized", () => {
  const results = parseOverpass("food", {
    elements: [
      { lat: 40.8, lon: -73.99, tags: { name: "Far Pantry", website: "javascript:alert(1)" } },
      { center: { lat: 40.751, lon: -73.99 }, tags: { name: "Near Kitchen", "addr:housenumber": "1", "addr:street": "Main St", phone: "555-0100", website: "example.org" } },
      { center: { lat: 40.751, lon: -73.99 }, tags: { name: "Near Kitchen" } },
      { lat: 40.76, lon: -73.99, tags: {} },
      { tags: { name: "No position" } },
    ],
  }, { lat: 40.75, lon: -73.99 })
  assert.deepEqual(results.map((r) => r.name), ["Near Kitchen", "Far Pantry"])
  assert.equal(results[0].address, "1 Main St")
  assert.equal(results[0].website, "https://example.org/")
  assert.equal(results[1].website, undefined)
  assert.equal(results[0].source, "OpenStreetMap contributors")
  assert.deepEqual(parseOverpass("food", null, { lat: 0, lon: 0 }), [])
})

test("FindTreatment rows map to treatment resources and malformed bodies yield nothing", () => {
  const results = parseFindTreatment({ rows: [
    { name1: "Recovery Center", name2: "Outpatient", street1: "2 Elm St", city: "Albany", state: "NY", zip: "12207", phone: "518-555-0100", website: "https://rc.example", latitude: "42.65", longitude: "-73.75", miles: 1.234 },
    { street1: "nameless" },
  ] })
  assert.equal(results.length, 1)
  assert.deepEqual(results[0], { name: "Recovery Center – Outpatient", kind: "treatment", address: "2 Elm St, Albany, NY, 12207", phone: "518-555-0100", website: "https://rc.example/", lat: 42.65, lon: -73.75, distanceMiles: 1.2, source: "SAMHSA FindTreatment.gov" })
  assert.deepEqual(parseFindTreatment({ error: "x" }), [])
  assert.match(findTreatmentUrl("12207"), /sAddr=12207&limitType=2&limitValue=16000/)
})

test("fallback directories are always available, with 211 last", () => {
  for (const kind of ["treatment", "food", "shelter", "pharmacy"] as const) {
    const links = fallbackLinks(kind)
    assert.equal(links.at(-1)?.url, "https://www.211.org/get-help")
  }
  assert.match(fallbackLinks("treatment", "12207")[0].url, /sAddr=12207/)
})
