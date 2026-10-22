import assert from "node:assert/strict"
import { test } from "node:test"
import { parseBraveCandidates } from "../lib/resource-web-search"

test("Brave parser keeps only bounded public http(s) result fields", () => {
  assert.deepEqual(parseBraveCandidates({
    web: {
      results: [
        { title: "Community pantry", url: "https://example.org/pantry", description: "Free food support", extra: { private: "ignored" } },
        { title: "Bad URL", url: "javascript:alert(1)", description: "ignored" },
        { title: "", url: "https://example.org/no-title" },
      ],
    },
  }), [{ title: "Community pantry", url: "https://example.org/pantry", description: "Free food support" }])
})

test("Brave parser caps candidates before Groq ranking", () => {
  const results = Array.from({ length: 25 }, (_, index) => ({ title: `Result ${index}`, url: `https://example.org/${index}` }))
  assert.equal(parseBraveCandidates({ web: { results } }).length, 10)
})
