import { strict as assert } from "node:assert"
import { test } from "node:test"
import { angelRequestSchema, buildChatMessages, findResourcesArgsSchema } from "../lib/angel-ai"
import { resourcesForModel, spokenResourceSummary, toAngelResources } from "../lib/angel-resources"
import { routeAngelTurn } from "../lib/angel-routing"
import { parseAngelLocalCommand } from "../lib/angel-voice-commands"
import type { NearbyResource } from "../lib/resource-finder"

const place = (name: string, distanceMiles: number): NearbyResource => ({ name, kind: "food", lat: 42.1, lon: -75.9, distanceMiles, source: "OpenStreetMap contributors", address: "1 Main St", phone: "607-555-0100" })

test("Angel can search several needs in one call, in Maslow order, and still accepts the single-kind form", () => {
  const many = findResourcesArgsSchema.safeParse({ kinds: ["jobs", "shelter", "food", "food"] })
  assert.ok(many.success)
  assert.deepEqual(many.data.kinds, ["food", "shelter", "jobs"])
  assert.equal(many.data.zip, undefined, "zip is optional when a location was shared")
  const legacy = findResourcesArgsSchema.safeParse({ kind: "pharmacy", zip: "13901" })
  assert.ok(legacy.success)
  assert.deepEqual(legacy.data, { kinds: ["pharmacy"], zip: "13901" })
  assert.equal(findResourcesArgsSchema.safeParse({}).success, false)
  assert.equal(findResourcesArgsSchema.safeParse({ kinds: [] }).success, false)
  assert.equal(findResourcesArgsSchema.safeParse({ kinds: ["casino"] }).success, false)
  assert.equal(findResourcesArgsSchema.safeParse({ kinds: ["food", "water", "toilets", "showers", "laundry", "clinic", "jobs"] }).success, false, "at most six needs per search")
})

test("a shared location is validated and never reaches the AI provider", () => {
  assert.equal(angelRequestSchema.safeParse({ messages: [{ role: "user", content: "hi" }], location: { lat: 95, lon: 0 } }).success, false)
  const request = angelRequestSchema.parse({ messages: [{ role: "user", content: "find food" }], location: { lat: 42.1, lon: -75.91 } })
  const messages = buildChatMessages(request)
  assert.ok(!JSON.stringify(messages).includes("42.1") && !JSON.stringify(messages).includes("75.91"), "coordinates are not in the model prompt")
  assert.match(messages[1].content, /shared their approximate location/)
  const withZip = buildChatMessages({ ...request, zip: "13901" })
  assert.match(withZip[1].content, /13901/)
  assert.ok(!withZip.some((m) => m.role === "system" && /approximate location/.test(m.content) && m !== withZip[0]), "a typed ZIP takes priority")
})

test("results are trimmed for the screen, stripped of coordinates for the model, and summarized for speech", () => {
  const resources = toAngelResources({
    status: "ok",
    groups: [
      { kind: "food", status: "ok", results: [place("Pantry A", 0.4), place("Pantry B", 1.2), place("C", 2), place("D", 3), place("E", 4), place("F", 5)], fallback: [] },
      { kind: "shelter", status: "ok", results: [place("Rescue Mission", 18)], widenedMiles: 25, fallback: [] },
      { kind: "showers", status: "ok", results: [], fallback: [{ title: "HUD Find Shelter", url: "https://www.hud.gov/FindShelter" }] },
      { kind: "treatment", status: "unavailable", results: [], fallback: [] },
    ],
  })
  assert.equal(resources.groups[0].results.length, 5)
  assert.equal(resources.groups[0].shortLabel, "Free food")
  const forModel = JSON.stringify(resourcesForModel(resources))
  assert.ok(!forModel.includes("42.1") && !forModel.includes("-75.9"), "no coordinates go to the model")
  assert.match(forModel, /Pantry A/)
  assert.doesNotMatch(forModel, /"D"/, "only the top three places per need")
  const spoken = spokenResourceSummary(resources)
  assert.match(spoken, /For free food: Pantry A, 0.4 miles away\./)
  assert.match(spoken, /For shelter: Rescue Mission, 18 miles away, farther away than usual\./)
  assert.match(spoken, /No listing for showers was found nearby/)
  assert.match(spoken, /treatment search is not available right now/)
  assert.match(spoken, /Call first to confirm\.$/)
  assert.equal(spokenResourceSummary(undefined), "")
})

test("stated needs in plain words turn on resource search", () => {
  assert.equal(routeAngelTurn("I'm starving and have nowhere to sleep tonight").useTools, true)
  assert.equal(routeAngelTurn("I need a shower").task, "resource")
  assert.equal(routeAngelTurn("Thanks").useTools, false)
})

test("location voice commands stay on the device", () => {
  assert.deepEqual(parseAngelLocalCommand("Use my location."), { type: "location", enabled: true })
  assert.deepEqual(parseAngelLocalCommand("share my current location"), { type: "location", enabled: true })
  assert.deepEqual(parseAngelLocalCommand("stop using my location"), { type: "location", enabled: false })
  assert.equal(parseAngelLocalCommand("where is my location history"), null)
})

test("lookupKinds asks only for the needs requested and widens sparse ones that come back empty", async () => {
  const { lookupKinds } = await import("../lib/resource-lookup")
  const realFetch = globalThis.fetch
  const hosts: string[] = []
  const queries: string[] = []
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    hosts.push(new URL(url).hostname)
    if (url.includes("findtreatment")) return new Response(JSON.stringify({ rows: [] }), { status: 200 })
    const query = decodeURIComponent(String(init?.body).replace(/^data=/, "").replace(/\+/g, " "))
    queries.push(query)
    const wide = queries.length > 1
    const elements = wide ? [{ lat: 40.97, lon: -73.99, tags: { amenity: "shelter", social_facility: "shelter", name: "Night Shelter" } }] : [{ lat: 40.751, lon: -73.99, tags: { amenity: "food_bank", name: "Corner Pantry" } }]
    return new Response(JSON.stringify({ elements }), { status: 200 })
  }) as typeof fetch
  try {
    const result = await lookupKinds(["shelter", "food"], { lat: 40.75, lon: -73.99 })
    assert.deepEqual(result.groups.map((g) => g.kind), ["food", "shelter"], "Maslow order")
    assert.ok(!hosts.some((h) => h.includes("findtreatment")), "treatment is not searched when not asked for")
    assert.equal(result.groups[0].results[0]?.name, "Corner Pantry")
    assert.ok(!queries[0].includes("library"), "only the requested needs are queried")
    assert.equal(queries.length, 2, "one normal search and one wider search")
    assert.ok(queries[1].includes("shelter") && !queries[1].includes("food_bank"), "only the empty sparse need is widened")
    assert.equal(result.status, "ok")
  } finally {
    globalThis.fetch = realFetch
  }
})
