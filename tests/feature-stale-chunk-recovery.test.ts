import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { CHUNK_RELOAD_COOLDOWN_MS, CHUNK_RELOAD_KEY, isChunkLoadError, reloadOnceForChunkError } from "../lib/chunk-reload"

const read = (path: string) => readFileSync(path, "utf8")

const memoryStorage = () => {
  const data = new Map<string, string>()
  return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value) }, data }
}

test("recognizes stale-build chunk failures across bundlers and browsers", () => {
  const turbopack = Object.assign(new Error("Failed to load chunk /_next/static/immutable/chunks/00f-19h-f9qd6.js from module 64893"), { name: "ChunkLoadError" })
  assert.equal(isChunkLoadError(turbopack), true)
  assert.equal(isChunkLoadError(new Error("Loading chunk 123 failed.")), true)
  assert.equal(isChunkLoadError(new Error("Loading CSS chunk app-page failed")), true)
  assert.equal(isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/_next/a.js")), true)
  assert.equal(isChunkLoadError(new TypeError("Importing a module script failed.")), true)
  assert.equal(isChunkLoadError(new Error("Cannot read properties of undefined")), false)
  assert.equal(isChunkLoadError(null), false)
  assert.equal(isChunkLoadError(undefined), false)
})

test("reloads once for a chunk error, then waits out the cooldown", () => {
  const storage = memoryStorage()
  let reloads = 0
  let now = 1_000_000
  const env = { storage, now: () => now, reload: () => { reloads += 1 } }
  const error = Object.assign(new Error("Failed to load chunk /_next/static/x.js"), { name: "ChunkLoadError" })

  assert.equal(reloadOnceForChunkError(error, env), true)
  assert.equal(reloads, 1)
  assert.equal(storage.data.get(CHUNK_RELOAD_KEY), String(now))

  now += 5_000
  assert.equal(reloadOnceForChunkError(error, env), false, "no reload loop while the build is still unreachable")
  assert.equal(reloads, 1)

  now += CHUNK_RELOAD_COOLDOWN_MS
  assert.equal(reloadOnceForChunkError(error, env), true)
  assert.equal(reloads, 2)
})

test("never reloads for ordinary errors or when storage is unavailable", () => {
  let reloads = 0
  const reload = () => { reloads += 1 }
  assert.equal(reloadOnceForChunkError(new Error("boom"), { storage: memoryStorage(), reload }), false)
  assert.equal(reloadOnceForChunkError(Object.assign(new Error("x"), { name: "ChunkLoadError" }), { storage: null, reload }), false)
  const throwing = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("blocked") } }
  assert.equal(reloadOnceForChunkError(Object.assign(new Error("x"), { name: "ChunkLoadError" }), { storage: throwing, reload }), false)
  assert.equal(reloads, 0)
})

test("error screens and the app shell recover from stale chunks and still show the fallback", () => {
  for (const file of ["app/error.tsx", "app/global-error.tsx"]) {
    const source = read(file)
    assert.match(source, /reloadOnceForChunkError\(error\)/, file)
    assert.match(source, /<EmergencyFallback /, file)
  }
  const register = read("components/pwa/service-worker-register.tsx")
  assert.match(register, /addEventListener\("unhandledrejection", onChunkRejection\)/)
  assert.match(register, /removeEventListener\("unhandledrejection", onChunkRejection\)/)
})

test("the service worker keeps hashed build files across shell cache bumps", () => {
  const sw = read("public/sw.js")
  assert.match(sw, /const STATIC_CACHE_NAME = "narcoguard-next-static-v1"/)
  assert.match(sw, /key !== CACHE_NAME && key !== TILE_CACHE_NAME && key !== STATIC_CACHE_NAME/)
  assert.match(sw, /pathname\.startsWith\("\/_next\/static\/"\)[\s\S]*staticAsset\(event\.request\)/)
  assert.match(sw, /STATIC_CACHE_MAX/)
})
