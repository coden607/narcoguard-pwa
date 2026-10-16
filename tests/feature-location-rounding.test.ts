import assert from "node:assert/strict"
import test from "node:test"
import { roundPlace } from "../lib/saved-place"

test("a shared location is rounded to about 1 km before it leaves the phone", () => {
  assert.deepEqual(roundPlace({ lat: 42.123456, lon: -75.987654 }), { lat: 42.12, lon: -75.99 })
  assert.deepEqual(roundPlace({ lat: -33.865143, lon: 151.2099 }), { lat: -33.87, lon: 151.21 })
  const sent = new URLSearchParams(Object.entries(roundPlace({ lat: 42.6526, lon: -73.7562 })).map(([k, v]) => [k, String(v)]))
  for (const value of sent.values()) assert.ok(!/\.\d{3,}/.test(value), `at most 2 decimal places: ${value}`)
})

test("a ZIP code is passed through unchanged", () => {
  assert.deepEqual(roundPlace({ zip: "13901" }), { zip: "13901" })
})
