import assert from "node:assert/strict"
import { test } from "node:test"
import { releaseScreenWakeLock, requestScreenWakeLock, wakeLockSupported } from "../lib/wake-lock"

function fakeSentinel() {
  const sentinel = { released: false, releases: 0, async release() { sentinel.released = true; sentinel.releases++ } }
  return sentinel
}

test("unsupported browsers are a quiet no-op", async () => {
  assert.equal(wakeLockSupported(undefined), false)
  assert.equal(wakeLockSupported({}), false)
  assert.equal(await requestScreenWakeLock({}), null)
  await releaseScreenWakeLock(null)
})

test("a refused request returns null instead of throwing", async () => {
  const nav = { wakeLock: { request: async () => { throw new DOMException("denied", "NotAllowedError") } } }
  assert.equal(await requestScreenWakeLock(nav), null)
})

test("a granted lock is requested for the screen and released once", async () => {
  const sentinel = fakeSentinel()
  const types: string[] = []
  const nav = { wakeLock: { request: async (type: "screen") => { types.push(type); return sentinel } } }
  assert.equal(await requestScreenWakeLock(nav), sentinel)
  assert.deepEqual(types, ["screen"])
  await releaseScreenWakeLock(sentinel)
  await releaseScreenWakeLock(sentinel)
  assert.equal(sentinel.releases, 1)
})
