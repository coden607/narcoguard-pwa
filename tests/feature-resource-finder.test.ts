import { strict as assert } from "node:assert"
import { test } from "node:test"
import { coarsen, fallbackLinks, findTreatmentUrl, haversineMiles, osmKindsOf, overpassQuery, parseFindTreatment, parseOverpass } from "../lib/resource-finder"

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
  assert.match(query, /nwr\["social_facility"="shelter"\]\["tourism"!~"\^\(hotel\)\$"\]\["amenity"!~"\^\(animal_shelter\)\$"\]\["name"!~"[^"]+",i\]\(40.6063,-74.1797,40.8937,-73.8003\);/)
  assert.match(query, /\["name"~"rescue mission\|salvation army/, "named missions and charities are searched too")
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

test("needs are fetched in two lighter Overpass queries that together cover every OpenStreetMap kind once", async () => {
  const { overpassNeedsQuery, OSM_QUERY_GROUPS, OSM_KIND_ORDER } = await import("../lib/resource-finder")
  const grouped = OSM_QUERY_GROUPS.flat()
  assert.deepEqual([...grouped].sort(), [...OSM_KIND_ORDER].sort())
  assert.equal(new Set(grouped).size, grouped.length)
  const near = overpassNeedsQuery(40.75, -73.99, OSM_QUERY_GROUPS[0])
  assert.match(near, /^\[out:json\]\[timeout:20\]\[maxsize:67108864\];\(/)
  assert.match(near, /nwr\["amenity"="drinking_water"\]\["access"!~"\^\(private\|no\|customers\)\$"\]\(40.732,-74.0137,40.768,-73.9663\);/)
  assert.doesNotMatch(near, /hospital|food_bank/)
  const wide = overpassNeedsQuery(40.75, -73.99, OSM_QUERY_GROUPS[1])
  assert.match(wide, /nwr\["amenity"="hospital"\]\["emergency"="yes"\]\(40.6063,-74.1797,40.8937,-73.8003\);/)
  assert.match(wide, /\);out center meta;$/)
  for (const tag of ["food_bank", "shelter", "shower", "employment_agency"]) assert.match(wide, new RegExp(`"${tag}"`))
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
    { lat: 40.76, lon: -73.99, tags: { social_facility: "shelter", tourism: "hotel", name: "Hotel Shelter" } },
    { lat: 40.76, lon: -73.99, tags: { social_facility: "shelter", name: "Night Shelter" } },
    { lat: 40.78, lon: -73.99, tags: { amenity: "drinking_water", name: "Box corner, beyond 2 km" } },
  ] }, origin)
  assert.deepEqual(grouped.water.map((r) => r.name), ["Drinking water"])
  assert.deepEqual(grouped.toilets.map((r) => [r.name, r.hours]), [["Public toilet", "24/7"]])
  assert.deepEqual(grouped.emergency.map((r) => r.name), ["General Hospital"])
  assert.deepEqual(grouped.library.map((r) => r.kind), ["library"])
  assert.deepEqual(grouped.shelter.map((r) => r.name), ["Night Shelter"])
  assert.deepEqual(grouped.pharmacy, [], "a pharmacy without a name is not listed")
  assert.equal(osmKindOf({ amenity: "bar" }), undefined)
  assert.equal(osmKindOf({ social_facility: "food_bank", amenity: "social_facility" }), "food")
  const many = parseOverpassNeeds({ elements: Array.from({ length: 9 }, (_, i) => ({ lat: 40.75 + i / 100, lon: -73.99, tags: { amenity: "library", name: `L${8 - i}` } })) }, origin)
  assert.deepEqual(many.library.map((r) => r.name), ["L8", "L7", "L6", "L5", "L4"])
  assert.equal(Object.keys(parseOverpassNeeds(null, origin)).length, 13)
})

test("every kind has directory fallbacks ending with 211", async () => {
  const { RESOURCE_KINDS } = await import("../lib/resource-finder")
  for (const kind of RESOURCE_KINDS) assert.equal(fallbackLinks(kind).at(-1)?.url, "https://www.211.org/get-help")
  assert.ok(fallbackLinks("community").some((link) => link.url.startsWith("https://www.na.org/")))
})

test("Overpass requests are hedged across instances: a slow one is backed up, a failed one hands over, all failures are summarized", async () => {
  const { fetchOverpass } = await import("../lib/resource-lookup")
  const realFetch = globalThis.fetch
  const calls: string[] = []
  const respond = (behaviour: Record<string, "ok" | "slow" | "429">) => {
    globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
      const host = new URL(String(input)).hostname
      calls.push(host)
      assert.match(String(init?.body), /^data=/)
      if (behaviour[host] === "429") return new Response("busy", { status: 429 })
      if (behaviour[host] === "slow") {
        return new Promise((_, reject) => init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "TimeoutError" }))))
      }
      return new Response(JSON.stringify({ elements: [], from: host }), { status: 200 })
    }) as typeof fetch
  }
  try {
    respond({ a: "slow", b: "ok" })
    assert.deepEqual(await fetchOverpass("q", ["https://a/api", "https://b/api"], 20, 1000), { elements: [], from: "b" })
    assert.deepEqual(calls, ["a", "b"])

    calls.length = 0
    respond({ a: "429", b: "ok" })
    const started = Date.now()
    assert.deepEqual(await fetchOverpass("q", ["https://a/api", "https://b/api"], 5000, 1000), { elements: [], from: "b" })
    assert.ok(Date.now() - started < 1000, "a failure starts the next instance without waiting for the hedge delay")

    respond({ a: "429", b: "slow" })
    await assert.rejects(fetchOverpass("q", ["https://a/api", "https://b/api"], 10, 50), /a responded 429; b TimeoutError/)
  } finally {
    globalThis.fetch = realFetch
  }
})

test("sparse needs with no nearby listing are searched once more, wider, and labelled as farther away", async () => {
  const { lookupNeeds } = await import("../lib/resource-lookup")
  const realFetch = globalThis.fetch
  const queries: string[] = []
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes("findtreatment")) return new Response(JSON.stringify({ rows: [] }), { status: 200 })
    const query = decodeURIComponent(String(init?.body).replace(/^data=/, "").replace(/\+/g, " "))
    queries.push(query)
    const wide = query.includes("food_bank") && !query.includes("hospital")
    // Normal searches find nothing; the wider one finds a food bank about 15 miles north.
    const elements = wide ? [{ lat: 40.97, lon: -73.99, tags: { amenity: "food_bank", name: "County Food Bank" } }] : []
    return new Response(JSON.stringify({ elements }), { status: 200 })
  }) as typeof fetch
  try {
    const result = await lookupNeeds({ lat: 40.75, lon: -73.99 })
    assert.equal(result.kinds.food.results[0]?.name, "County Food Bank")
    assert.equal(result.kinds.food.widenedMiles, 25)
    assert.equal(result.kinds.shelter.results.length, 0, "a kind still empty after widening stays empty")
    assert.equal(result.kinds.shelter.widenedMiles, undefined)
    assert.equal(result.kinds.library.widenedMiles, undefined, "dense kinds are never widened")
    const wideQuery = queries.find((query) => query.includes("food_bank") && !query.includes("hospital"))
    assert.ok(wideQuery && !wideQuery.includes("library"), "the wider search asks only for the empty sparse kinds")
  } finally {
    globalThis.fetch = realFetch
  }
})

test("basic needs cover community fridges, homeless services and showers tagged on truck stops", async () => {
  const { osmKindsOf, parseOverpassNeeds } = await import("../lib/resource-finder")
  assert.deepEqual(osmKindsOf({ amenity: "food_sharing" }), ["food"])
  assert.deepEqual(osmKindsOf({ amenity: "social_facility", social_facility: "outreach", "social_facility:for": "homeless" }), ["shelter", "community"])
  assert.deepEqual(osmKindsOf({ amenity: "fuel", shop: "convenience", shower: "yes" }), ["quick-meal", "showers"])
  assert.deepEqual(osmKindsOf({ amenity: "shower", access: "customers" }), [])
  const origin = { lat: 42.1, lon: -75.9 }
  const grouped = parseOverpassNeeds({ elements: [{ type: "node", id: 1, lat: 42.11, lon: -75.9, tags: { name: "Truck Stop", shop: "convenience", shower: "yes" } }] }, origin)
  assert.equal(grouped.showers[0]?.name, "Truck Stop")
  assert.equal(grouped["quick-meal"][0]?.name, "Truck Stop")
})

test("when one directory request fails, places the other request found for that need are kept", async () => {
  const { lookupNeeds } = await import("../lib/resource-lookup")
  const realFetch = globalThis.fetch
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    if (String(input).includes("findtreatment")) return new Response(JSON.stringify({ rows: [] }), { status: 200 })
    const query = decodeURIComponent(String(init?.body).replace(/^data=/, "").replace(/\+/g, " "))
    // The sparse-services request (food, shelter, showers...) fails; the everyday request answers.
    if (query.includes("hospital")) return new Response("busy", { status: 504 })
    const elements = [
      { lat: 40.76, lon: -73.99, tags: { name: "Truck Stop", shop: "convenience", shower: "yes" } },
      { lat: 40.755, lon: -73.99, tags: { amenity: "food_sharing" } },
    ]
    return new Response(JSON.stringify({ elements }), { status: 200 })
  }) as typeof fetch
  try {
    const result = await lookupNeeds({ lat: 40.75, lon: -73.99 })
    assert.equal(result.status, "partial")
    assert.equal(result.kinds.showers.status, "ok")
    assert.equal(result.kinds.showers.results[0]?.name, "Truck Stop")
    assert.equal(result.kinds["quick-meal"].results[0]?.name, "Truck Stop")
    assert.equal(result.kinds.shelter.status, "unavailable", "a need with no answer and no incidental match stays unavailable")
  } finally {
    globalThis.fetch = realFetch
  }
})

test("unnamed community fridges are kept with a generic name", async () => {
  const { parseOverpassNeeds } = await import("../lib/resource-finder")
  const grouped = parseOverpassNeeds({ elements: [{ type: "node", id: 2, lat: 42.101, lon: -75.9, tags: { amenity: "food_sharing" } }] }, { lat: 42.1, lon: -75.9 })
  assert.equal(grouped.food[0]?.name, "Food pantry or community fridge")
})

test("Overpass queries ask for metadata so listings can say when map data was last edited", async () => {
  const { overpassNeedsQuery } = await import("../lib/resource-finder")
  assert.match(overpassQuery("water", 40.75, -73.99), /out center meta;$/)
  assert.match(overpassNeedsQuery(40.75, -73.99), /out center meta;$/)
  assert.doesNotMatch(overpassQuery("water", 40.75, -73.99), /out center tags/)
})

test("map listings carry their last-edited date, keep the raw hours string, and map wheelchair access only when tagged yes, limited or no", () => {
  const results = parseOverpass("toilets", { elements: [
    { lat: 40.751, lon: -73.99, timestamp: "2024-05-17T08:30:00Z", tags: { name: "Accessible Toilet", wheelchair: "yes", opening_hours: "Mo-Fr 08:00-18:00" } },
    { lat: 40.752, lon: -73.99, tags: { name: "Limited Toilet", wheelchair: "limited" } },
    { lat: 40.753, lon: -73.99, tags: { name: "Stepped Toilet", wheelchair: "no" } },
    { lat: 40.754, lon: -73.99, tags: { name: "Vague Toilet", wheelchair: "designated" } },
  ] }, { lat: 40.75, lon: -73.99 })
  assert.equal(results[0].lastUpdated, "2024-05-17")
  assert.equal(results[0].hours, "Mo-Fr 08:00-18:00", "the raw opening_hours string is kept for backward compatibility")
  assert.equal(results[0].wheelchair, "yes")
  assert.equal(results[1].wheelchair, "limited")
  assert.equal(results[2].wheelchair, "no")
  assert.equal(results[3].wheelchair, undefined, "other wheelchair values are not mapped")
  assert.ok(results.slice(1).every((result) => result.lastUpdated === undefined), "no timestamp, no lastUpdated field")
})

test("FindTreatment service categories become a compact treatment-and-payment summary", () => {
  const [row] = parseFindTreatment({ rows: [
    { name1: "Recovery Center", services: [
      { f1: "Type of Care", f2: null, f3: "Substance use treatment; Mental health treatment" },
      { f1: "Payment Assistance", f2: null, f3: "Payment assistance (check with facility for details)" },
      { f1: "Service Setting", f2: null, f3: "Outpatient; Intensive outpatient" },
    ] },
  ] })
  assert.equal(row.services, "Substance use treatment; Mental health treatment; Payment assistance (check with facility for details)")
  const empty = parseFindTreatment({ rows: [{ name1: "Empty", services: [] }] })
  assert.equal(empty[0].services, undefined)
  const missing = parseFindTreatment({ rows: [{ name1: "Missing" }] })
  assert.equal(missing[0].services, undefined)
  const unrelated = parseFindTreatment({ rows: [{ name1: "Unrelated", services: [{ f1: "Service Setting", f2: null, f3: "Outpatient" }] }] })
  assert.equal(unrelated[0].services, undefined, "categories other than type of care and payment are not summarized")
  const malformed = parseFindTreatment({ rows: [{ name1: "Odd", services: [null, { f1: 7, f3: "Nope" }, { f1: "Type of Care" }] }] })
  assert.equal(malformed[0].services, undefined)
})

test("a FindTreatment services summary is cut at a value boundary rather than mid-word past 160 characters", () => {
  const [row] = parseFindTreatment({ rows: [
    { name1: "Big Center", services: [
      { f1: "Type of Care", f2: null, f3: "Substance use treatment; Mental health treatment; Co-occurring substance and mental health treatment; Medication-assisted treatment" },
      { f1: "Payment/Insurance Accepted", f2: null, f3: "Medicaid; Sliding fee scale (fee is based on income and other factors); Payment assistance (check with facility for details)" },
    ] },
  ] })
  const summary = row.services ?? ""
  assert.ok(summary.length > 0 && summary.length <= 160, String(summary.length))
  assert.doesNotMatch(summary, /;\s*$/, "the summary never ends with a dangling separator")
  assert.equal(summary, "Substance use treatment; Mental health treatment; Co-occurring substance and mental health treatment; Medication-assisted treatment; Medicaid")
})

test("Angel's spoken summary adds wheelchair access and map-data age while never speaking coordinates", async () => {
  const { spokenResourceSummary, toAngelResources } = await import("../lib/angel-resources")
  const spoken = spokenResourceSummary(toAngelResources({ status: "ok", groups: [
    { kind: "food", status: "ok", results: [{ name: "Open Pantry", kind: "food", wheelchair: "yes", lastUpdated: "2024-05-17", distanceMiles: 0.5, lat: 40.751, lon: -73.99, source: "OpenStreetMap contributors" }], fallback: [] },
    { kind: "shelter", status: "ok", results: [{ name: "Night Shelter", kind: "shelter", lastUpdated: "2023-11-02", distanceMiles: 1.2, source: "OpenStreetMap contributors" }], fallback: [] },
  ] }))
  assert.match(spoken, /For free food: Open Pantry, 0\.5 miles away, wheelchair accessible per map data, map data from May 2024\./)
  assert.match(spoken, /For shelter: Night Shelter, 1\.2 miles away, map data from November 2023\./)
  assert.doesNotMatch(spoken, /40\.7|-73\.9/, "precise coordinates are never spoken")
})

test("substance use treatment is listed before mental-health-only programs, nearest first within each", () => {
  const row = (name: string, miles: number, care?: string) => ({ name1: name, latitude: 42, longitude: -75, miles, ...(care ? { services: [{ f1: "Type of Care", f2: null, f3: care }] } : {}) })
  const results = parseFindTreatment({ rows: [
    row("Crisis Residence", 1, "Mental health treatment"),
    row("Unknown Services", 1.5),
    row("Recovery Center", 2, "Substance use treatment; Mental health treatment"),
    row("Opioid Program", 3, "Opioid treatment program"),
  ] })
  assert.deepEqual(results.map((r) => r.name), ["Recovery Center", "Opioid Program", "Unknown Services", "Crisis Residence"])
  assert.match(findTreatmentUrl(42, -75), /pageSize=30/)
})

test("shelters, food, water and toilets are also found by well-known names and public amenities, never by animal shelters or shops", () => {
  assert.deepEqual(osmKindsOf({ amenity: "place_of_worship", name: "Binghamton Rescue Mission" }), ["food", "shelter"])
  assert.deepEqual(osmKindsOf({ office: "ngo", name: "Catholic Charities of Broome County" }), ["food", "shelter"])
  assert.deepEqual(osmKindsOf({ building: "yes", name: "YWCA Women's Shelter" }), ["shelter"])
  assert.deepEqual(osmKindsOf({ amenity: "animal_shelter", name: "Humane Society Shelter" }), [])
  assert.deepEqual(osmKindsOf({ office: "company", name: "Cat Rescue Shelter for Strays" }), [])
  assert.deepEqual(osmKindsOf({ highway: "residential", name: "Mission Street" }), [], "streets never match by name")
  assert.deepEqual(osmKindsOf({ amenity: "place_of_worship", name: "St. Paul's Food Pantry" }), ["food"])
  assert.ok(osmKindsOf({ leisure: "park", drinking_water: "yes", toilets: "yes", name: "Recreation Park" }).includes("water"))
  assert.ok(osmKindsOf({ leisure: "park", drinking_water: "yes", toilets: "yes", name: "Recreation Park" }).includes("toilets"))
  assert.deepEqual(osmKindsOf({ amenity: "fast_food", toilets: "yes", name: "Burger Place" }).filter((k) => k === "toilets"), [], "restaurant toilets are for customers")
  assert.deepEqual(osmKindsOf({ amenity: "library", toilets: "yes", "toilets:access": "customers", name: "Branch" }).filter((k) => k === "toilets"), [])
})
