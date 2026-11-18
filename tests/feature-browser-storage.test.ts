import assert from "node:assert/strict"
import { test } from "node:test"
import { browserStorage } from "../lib/browser-storage"
import { readRememberChoice, readSavedPlace, savePlace } from "../lib/saved-place"
import { readTravel } from "../lib/travel-mode"

test("denied storage property access reaches the readers' existing unavailable states", () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window")
  Object.defineProperty(globalThis, "window", { configurable: true, value: { get localStorage() { throw new Error("blocked") } } })
  try {
    assert.equal(readRememberChoice(browserStorage()), false)
    assert.equal(readSavedPlace(browserStorage()), null)
    assert.equal(readTravel(browserStorage()), null)
    assert.doesNotThrow(() => savePlace(browserStorage(), { zip: "13901" }))
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous)
    else Reflect.deleteProperty(globalThis, "window")
  }
})
