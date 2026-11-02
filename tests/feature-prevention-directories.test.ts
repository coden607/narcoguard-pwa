import assert from "node:assert/strict"
import { test } from "node:test"
import { PREVENTION_DIRECTORIES } from "../lib/care-directories"

test("prevention covers syringe services, testing and PrEP", () => {
  assert.deepEqual(PREVENTION_DIRECTORIES.map((group) => group.id), ["syringe-services", "testing", "prep"])
})

test("every link is https and unique", () => {
  const urls = PREVENTION_DIRECTORIES.flatMap((group) => group.links.map((link) => link.url))
  for (const url of urls) assert.match(url, /^https:\/\//)
  assert.equal(new Set(urls).size, urls.length)
})
