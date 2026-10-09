import assert from "node:assert/strict"
import test from "node:test"
import { forgetPlace, readRememberChoice, readSavedPlace, saveRememberChoice, savePlace, zipFromMessage } from "../lib/saved-place"

const memory = () => {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k), data }
}

test("a place is remembered rounded to about 1 km, and forgotten on request", () => {
  const store = memory()
  savePlace(store, { lat: 42.123456, lon: -75.987654 })
  assert.deepEqual(readSavedPlace(store), { lat: 42.12, lon: -75.99 })
  assert.ok(!store.data.get("narcoguard_saved_place_v1")?.includes("42.123"), "precise coordinates are never written")
  savePlace(store, { zip: "13901" })
  assert.deepEqual(readSavedPlace(store), { zip: "13901" })
  savePlace(store, { zip: "1390" })
  assert.deepEqual(readSavedPlace(store), { zip: "13901" }, "an invalid ZIP is ignored")
  forgetPlace(store)
  assert.equal(readSavedPlace(store), null)
})

test("turning remembering off erases the saved place; broken storage remembers nothing", () => {
  const store = memory()
  assert.equal(readRememberChoice(store), true)
  savePlace(store, { zip: "13901" })
  saveRememberChoice(store, false)
  assert.equal(readRememberChoice(store), false)
  assert.equal(readSavedPlace(store), null)
  const broken = { getItem: () => { throw new Error("blocked") }, setItem: () => { throw new Error("blocked") }, removeItem: () => { throw new Error("blocked") } }
  assert.equal(readSavedPlace(broken), null)
  assert.equal(readRememberChoice(broken), false)
  assert.doesNotThrow(() => savePlace(broken, { zip: "13901" }))
  store.setItem("narcoguard_saved_place_v1", "{not json")
  assert.equal(readSavedPlace(store), null)
})

test("a ZIP is taken from plain words, not from any five-digit number", () => {
  assert.equal(zipFromMessage("13901"), "13901")
  assert.equal(zipFromMessage("my zip is 13901"), "13901")
  assert.equal(zipFromMessage("I'm in 13905 and hungry"), "13905")
  assert.equal(zipFromMessage("zip code: 10001"), "10001")
  assert.equal(zipFromMessage("I have 12345 dollars of debt"), undefined)
  assert.equal(zipFromMessage("call 98765 now"), undefined)
})
