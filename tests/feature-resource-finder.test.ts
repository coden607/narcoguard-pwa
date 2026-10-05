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
  assert.match(query, /social_facility"="shelter"\]\(40.6063,-74.1797,40.8937,-73.8003\);/)
  assert.doesNotMatch(query, /around/)
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
  assert.match(findTreatmentUrl(42.65, -73.75), /sAddr=42.65%2C-73.75&limitType=2&limitValue=16000/)
  const dupes = parseFindTreatment({ rows: [{ name1: "A", street1: "1 St" }, { name1: "A", street1: "1 St" }, { name1: "A", street1: "2 St" }] })
  assert.equal(dupes.length, 2)
})

test("fallback directories are always available, with 211 last", () => {
  for (const kind of ["treatment", "food", "shelter", "pharmacy"] as const) {
    const links = fallbackLinks(kind)
    assert.equal(links.at(-1)?.url, "https://www.211.org/get-help")
  }
  // The ZIP is never put into third-party URLs.
  assert.equal(fallbackLinks("treatment")[0].url, "https://findtreatment.gov/")
})

test("every kind belongs to exactly one need level, and every OpenStreetMap kind has filters", async () => {
  const { NEED_LEVELS, RESOURCE_KINDS, OSM_KINDS } = await import("../lib/resource-finder")
  const levelled = NEED_LEVELS.flatMap((level) => [...level.kinds])
  assert.deepEqual([...levelled].sort(), [...RESOURCE_KINDS].sort())
  assert.equal(new Set(levelled).size, levelled.length)
  for (const spec of Object.values(OSM_KINDS)) assert.ok(spec.filters.length > 0 && spec.radius > 0)
})

test("the combined needs query asks Overpass once for every kind, with per-kind radius and public-access filters", async () => {
  const { overpassNeedsQuery } = await import("../lib/resource-finder")
  const query = overpassNeedsQuery(40.75, -73.99)
  assert.match(query, /^\[out:json\]\[timeout:25\];\(/)
  assert.match(query, /nwr\["amenity"="drinking_water"\]\["access"!~"\^\(private\|no\|customers\)\$"\]\(40.7231,-74.0256,40.7769,-73.9544\);/)
  assert.match(query, /nwr\["amenity"="hospital"\]\["emergency"="yes"\]\(40.5344,-74.2746,40.9656,-73.7054\);/)
  for (const tag of ["food_bank", "shelter", "pharmacy", "toilets", "shower", "laundry", "clinic", "community_centre", "library", "employment_agency"]) assert.match(query, new RegExp(`"${tag}"`))
  assert.match(query, /\);out center tags;$/)
})

test("combined results are sorted into kinds by tags, unnamed public amenities get a plain name, and private ones are dropped", async () => {
  const { parseOverpassNeeds, osmKindOf } = await import("../lib/resource-finder")
  const origin = { lat: 40.75, lon: -73.99 }
  const grouped = parseOverpassNeeds({ elements: [
    { lat: 40.751, lon: -73.99, tags: { amenity: "drinking_water" } },
    { lat: 40.752, lon: -73.99, tags: { amenity: "toilets", access: "customers" } },
    { lat: 40.753, lon: -73.99, tags: { amenity: "toilets", opening_hours: "24/7" } },
    { lat: 40.76, lon: -73.99, tags: { amenity: "hospital", emergency: "yes", name: "General Hospital" } },
    { lat: 40.76, lon: -73.99, tags: { amenity: "hospital", emergency: "no", name: "Rehab Hospital" } },
    { lat: 40.77, lon: -73.99, tags: { amenity: "library", name: "Main Library" } },
    { lat: 40.78, lon: -73.99, tags: { amenity: "pharmacy" } },
    { lat: 40.79, lon: -73.99, tags: { amenity: "bar", name: "Not a resource" } },
    { lat: 40.78, lon: -73.99, tags: { amenity: "drinking_water", name: "Box corner, beyond 3 km" } },
  ] }, origin)
  assert.deepEqual(grouped.water.map((r) => r.name), ["Drinking water"])
  assert.deepEqual(grouped.toilets.map((r) => [r.name, r.hours]), [["Public toilet", "24/7"]])
  assert.deepEqual(grouped.emergency.map((r) => r.name), ["General Hospital"])
  assert.deepEqual(grouped.library.map((r) => r.kind), ["library"])
  assert.deepEqual(grouped.pharmacy, [], "a pharmacy without a name is not listed")
  assert.equal(osmKindOf({ amenity: "bar" }), undefined)
  assert.equal(osmKindOf({ social_facility: "food_bank", amenity: "social_facility" }), "food")
  const many = parseOverpassNeeds({ elements: Array.from({ length: 9 }, (_, i) => ({ lat: 40.75 + i / 100, lon: -73.99, tags: { amenity: "library", name: `L${8 - i}` } })) }, origin)
  assert.deepEqual(many.library.map((r) => r.name), ["L8", "L7", "L6", "L5", "L4"])
  assert.equal(Object.keys(parseOverpassNeeds(null, origin)).length, 12)
})

test("every kind has directory fallbacks ending with 211", async () => {
  const { RESOURCE_KINDS } = await import("../lib/resource-finder")
  for (const kind of RESOURCE_KINDS) assert.equal(fallbackLinks(kind).at(-1)?.url, "https://www.211.org/get-help")
  assert.ok(fallbackLinks("community").some((link) => link.url.startsWith("https://www.na.org/")))
})
