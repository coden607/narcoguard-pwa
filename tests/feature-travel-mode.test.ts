import assert from "node:assert/strict"
import { test } from "node:test"
import {
  activateTravel,
  deactivateTravel,
  effectiveZip,
  extendTravel,
  isTravelExpired,
  rankForTravel,
  readTravel,
  travelBanner,
  TRAVEL_MAX_MINUTES,
  TRAVEL_MIN_MINUTES,
} from "../lib/travel-mode"

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void }

const memoryStorage = (): StorageLike => {
  const map = new Map<string, string>()
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => void map.set(key, value) }
}

const NOW = "2026-10-14T12:00:00.000Z"

test("activation validates ZIPs and requires destination != home", () => {
  const storage = memoryStorage()
  assert.equal(activateTravel(storage, { destinationZip: "13202", homeZip: "13201", now: NOW }).ok, true)
  assert.equal(activateTravel(storage, { destinationZip: "1320", homeZip: "13201", now: NOW }).ok, false)
  assert.equal(activateTravel(storage, { destinationZip: "13201", homeZip: "13201", now: NOW }).ok, false)
  assert.equal(activateTravel(memoryStorage(), { destinationZip: null, homeZip: "13201", now: NOW }).ok, false)
})

test("non-finite activation duration is rejected without throwing", () => {
  const result = activateTravel(memoryStorage(), { destinationZip: "13202", homeZip: "13201", durationMinutes: Number.NaN, now: NOW })
  assert.equal(result.ok, false)
})

test("duration clamps to the allowed window; default is 24h", () => {
  const storage = memoryStorage()
  const short = activateTravel(storage, { destinationZip: "13202", homeZip: "13201", durationMinutes: 1, now: NOW })
  assert.equal(short.ok, true)
  if (short.ok) {
    const span = (Date.parse(short.state.expiresAt) - Date.parse(NOW)) / 60000
    assert.equal(span, TRAVEL_MIN_MINUTES)
  }
  const far = activateTravel(memoryStorage(), { destinationZip: "13202", homeZip: "13201", durationMinutes: 999999, now: NOW })
  assert.equal(far.ok, true)
  if (far.ok) {
    const span = (Date.parse(far.state.expiresAt) - Date.parse(NOW)) / 60000
    assert.equal(span, TRAVEL_MAX_MINUTES)
  }
})

test("effectiveZip returns destination inside the window and home after it", () => {
  const storage = memoryStorage()
  const activated = activateTravel(storage, { destinationZip: "13202", homeZip: "13201", durationMinutes: 60, now: NOW })
  assert.equal(activated.ok, true)
  if (!activated.ok) return
  assert.deepEqual(effectiveZip(activated.state, "2026-10-14T12:30:00.000Z"), { zip: "13202", inTravel: true })
  assert.deepEqual(effectiveZip(activated.state, "2026-10-14T13:00:00.000Z"), { zip: "13201", inTravel: false })
  assert.equal(isTravelExpired(activated.state, "2026-10-14T13:00:01.000Z"), true)
})

test("no state means no ZIP is implied", () => {
  assert.deepEqual(effectiveZip(null, NOW), { zip: "", inTravel: false })
  assert.equal(readTravel(memoryStorage()), null)
})

test("deactivation deletes the record including the home ZIP", () => {
  const storage = memoryStorage()
  const activated = activateTravel(storage, { destinationZip: "13202", homeZip: "13201", now: NOW })
  assert.equal(activated.ok, true)
  assert.equal(deactivateTravel(storage), true)
  assert.equal(deactivateTravel(storage), false)
  assert.equal(readTravel(storage), null)
  assert.equal(storage.getItem("narcoguard_travel_mode_v1"), "")
})

test("extension is capped at 14 days from the original start", () => {
  const storage = memoryStorage()
  const activated = activateTravel(storage, { destinationZip: "13202", homeZip: "13201", durationMinutes: 60, now: NOW })
  assert.equal(activated.ok, true)
  if (!activated.ok) return
  const extended = extendTravel(storage, TRAVEL_MAX_MINUTES, NOW)
  assert.equal(extended.ok, true)
  if (extended.ok) {
    const total = (Date.parse(extended.state.expiresAt) - Date.parse(NOW)) / 60000
    assert.equal(total, TRAVEL_MAX_MINUTES)
  }
  const again = extendTravel(storage, 10, "2026-10-15T00:00:00.000Z")
  assert.equal(again.ok, true)
  if (again.ok) {
    const total = (Date.parse(again.state.expiresAt) - Date.parse(NOW)) / 60000
    assert.equal(total, TRAVEL_MAX_MINUTES)
  }
})

test("expired windows cannot be extended", () => {
  const storage = memoryStorage()
  const activated = activateTravel(storage, { destinationZip: "13202", homeZip: "13201", durationMinutes: 30, now: NOW })
  assert.equal(activated.ok, true)
  assert.equal(extendTravel(storage, 60, "2026-10-14T14:00:00.000Z").ok, false)
})

test("travelBanner reports remaining minutes and vanishes on expiry", () => {
  const storage = memoryStorage()
  const activated = activateTravel(storage, { destinationZip: "13202", homeZip: "13201", durationMinutes: 90, now: NOW })
  assert.equal(activated.ok, true)
  if (!activated.ok) return
  const banner = travelBanner(activated.state, "2026-10-14T12:30:00.000Z")
  assert.equal(banner?.destinationZip, "13202")
  assert.equal(banner?.remainingMinutes, 60)
  assert.equal(travelBanner(activated.state, "2026-10-14T13:30:00.000Z"), null)
})

test("rankForTravel puts destination-ZIP resources first and preserves order within groups", () => {
  const storage = memoryStorage()
  const activated = activateTravel(storage, { destinationZip: "13202", homeZip: "13201", durationMinutes: 60, now: NOW })
  assert.equal(activated.ok, true)
  if (!activated.ok) return
  const items = [
    { zip: "13201", name: "home-1" },
    { zip: "13202", name: "dest-1" },
    { zip: "13201", name: "home-2" },
    { zip: "13202", name: "dest-2" },
  ]
  const ranked = rankForTravel(items, activated.state, "2026-10-14T12:10:00.000Z")
  assert.deepEqual(ranked.map((r) => r.name), ["dest-1", "dest-2", "home-1", "home-2"])
  const after = rankForTravel(items, activated.state, "2026-10-14T13:10:00.000Z")
  assert.deepEqual(after.map((r) => r.name), ["home-1", "dest-1", "home-2", "dest-2"])
})

test("corrupt storage reads as no travel", () => {
  const storage = memoryStorage()
  storage.setItem("narcoguard_travel_mode_v1", "{broken")
  assert.equal(readTravel(storage), null)
  assert.equal(activateTravel(storage, { destinationZip: "13202", homeZip: "13201", now: NOW }).ok, true)
})

test("the stored record contains ZIP strings only — no coordinate fields", () => {
  const storage = memoryStorage()
  activateTravel(storage, { destinationZip: "13202", homeZip: "13201", now: NOW })
  const raw = JSON.parse(storage.getItem("narcoguard_travel_mode_v1")!)
  assert.deepEqual(Object.keys(raw).sort(), ["active", "destinationZip", "expiresAt", "homeZip", "startedAt", "version"])
})
