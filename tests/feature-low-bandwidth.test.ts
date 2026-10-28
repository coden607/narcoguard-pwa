import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { fetchDirectory, isLowBandwidthActive, readLowBandwidthChoice, saveLowBandwidthChoice, systemSavesData } from "../lib/low-bandwidth"

const memory = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data }
}

const jsonResponse = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } })

test("low data mode is off by default, persists a choice, and survives blocked storage", () => {
  const store = memory()
  assert.equal(readLowBandwidthChoice(store), false)
  saveLowBandwidthChoice(store, true)
  assert.equal(readLowBandwidthChoice(store), true)
  assert.equal(store.data.get("narcoguard_low_bandwidth_v1"), "on")
  saveLowBandwidthChoice(store, false)
  assert.equal(readLowBandwidthChoice(store), false)
  const broken = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("blocked") }, removeItem: () => { throw new Error("blocked") } }
  assert.equal(readLowBandwidthChoice(broken), false)
  assert.doesNotThrow(() => saveLowBandwidthChoice(broken, true))
})

test("low data mode is active when the person chose it or the device asks to save data", () => {
  const store = memory()
  assert.equal(systemSavesData({ saveData: true }), true)
  assert.equal(systemSavesData({ saveData: false }), false)
  assert.equal(systemSavesData(undefined), false)
  assert.equal(isLowBandwidthActive(store, { saveData: true }), true, "device data-saver turns it on without a choice")
  assert.equal(isLowBandwidthActive(store, undefined), false)
  saveLowBandwidthChoice(store, true)
  assert.equal(isLowBandwidthActive(store, { saveData: false }), true, "an explicit choice wins over a device hint")
})

test("cache-first fetch answers from the on-device cache and refreshes in the background", async () => {
  let fetches = 0
  const stored = new Map<string, string>()
  const caches = {
    match: async (key: string) => (stored.has(key) ? new Response(stored.get(key), { status: 200, headers: { "Content-Type": "application/json" } }) : undefined),
    put: async (key: string, response: Response) => { stored.set(key, await response.text()) },
  }
  const online = async () => { fetches += 1; return jsonResponse({ status: "ok", kinds: {}, fetchedAt: `t${fetches}` }) }
  // Empty cache + working network: fetches once and stores the answer.
  const first = await fetchDirectory("/api/resources/needs?zip=13901&web=0", { lowData: true, caches, fetchImpl: online })
  assert.deepEqual([first.ok, first.servedFromCache, first.fetchedAt], [true, false, "t1"])
  assert.equal(fetches, 1)
  assert.equal(stored.size, 1)
  // Cached answer still serves when the network is down; nothing is promised beyond the cache.
  let offlineFetches = 0
  const second = await fetchDirectory("/api/resources/needs?zip=13901&web=0", {
    lowData: true,
    caches,
    fetchImpl: async () => { offlineFetches += 1; throw new Error("offline") },
  })
  assert.deepEqual([second.ok, second.servedFromCache, second.fetchedAt], [true, true, "t1"])
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(offlineFetches, 1, "a cached answer still tries one background refresh")
  // Background refresh with the network back updates the cache and reports the fresh body.
  let resolveRefresh: ((value: { body: unknown; fetchedAt?: string }) => void) | undefined
  const refreshed = new Promise<{ body: unknown; fetchedAt?: string }>((resolve) => { resolveRefresh = resolve })
  const third = await fetchDirectory("/api/resources/needs?zip=13901&web=0", {
    lowData: true,
    caches,
    fetchImpl: online,
    onRefresh: (result) => resolveRefresh?.(result),
  })
  assert.equal(third.servedFromCache, true)
  const refresh = await Promise.race<{ body: unknown; fetchedAt?: string }>([refreshed, new Promise<{ body: unknown; fetchedAt?: string }>((_, reject) => setTimeout(() => reject(new Error("no refresh")), 500))])
  assert.equal((refresh.body as { fetchedAt?: string }).fetchedAt, "t2", "the background refresh reports the fresh body")
  assert.equal(fetches, 2)
})

test("cache-first fetch reports failure explicitly only when the cache is empty and the network fails", async () => {
  const empty = { match: async () => undefined, put: async () => undefined }
  const offline = await fetchDirectory("/api/resources/needs?zip=13901&web=0", { lowData: true, caches: empty, fetchImpl: async () => { throw new Error("offline") } })
  assert.deepEqual([offline.ok, offline.servedFromCache], [false, false])
  const badStatus = await fetchDirectory("/api/resources/needs?zip=13901&web=0", { lowData: true, caches: empty, fetchImpl: async () => new Response("boom", { status: 502 }) })
  assert.equal(badStatus.ok, false)
})

test("with low data off the fetch is a plain request and nothing is cached", async () => {
  const putCalls: string[] = []
  const caches = { match: async () => undefined, put: async (key: string) => void putCalls.push(key) }
  const result = await fetchDirectory("/api/resources/needs?zip=13901", {
    lowData: false,
    caches,
    fetchImpl: async (url) => { assert.equal(url, "/api/resources/needs?zip=13901"); return jsonResponse({ status: "ok", kinds: {} }) },
  })
  assert.deepEqual([result.ok, result.servedFromCache], [true, false])
  assert.equal(putCalls.length, 0)
})

test("find help exposes the low data toggle, explicit cached-state note, and skips web leads and the AI probe", async () => {
  const source = await readFile(new URL("../components/resources/needs-finder.tsx", import.meta.url), "utf8")
  assert.match(source, /data-testid="low-data-toggle"/)
  assert.match(source, /Low data mode: \{lowData \? "on" : "off"\}/)
  assert.match(source, /data-testid="cached-results-note"/)
  assert.match(source, /It may be out of date — call first/)
  assert.match(source, /Fresh web leads are off in low data mode/)
  assert.match(source, /params\.set\("web", "0"\)/)
  assert.match(source, /fetchDirectory\(`\/api\/resources\/needs\?\$\{params\}`/)
  assert.match(source, /skips this probe/)
  assert.match(source, /tel:911/)
})

test("the needs API honors web=0 by skipping the fresh web search", async () => {
  const source = await readFile(new URL("../app/api/resources/needs/route.ts", import.meta.url), "utf8")
  assert.match(source, /searchParams\.get\("web"\) === "0"/)
  assert.match(source, /!skipFreshWeb \? searchFreshZipResources/)
  assert.match(source, /Promise\.resolve\(\{ status: "skipped" as const, results: \[\] \}\)/)
})
