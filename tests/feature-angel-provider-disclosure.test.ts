import assert from "node:assert/strict"
import { test } from "node:test"
import { angelProviderDisclosure } from "../components/ai/angel-ai"

test("provider disclosure never labels OpenAI-compatible traffic as Groq", () => {
  const direct = angelProviderDisclosure("OpenAI-compatible", null, false)
  assert.match(direct, /OpenAI-compatible/)
  assert.doesNotMatch(direct, /sent to Groq/)
})

test("strict privacy disclosure rejects direct compatibility route wording", () => {
  assert.match(angelProviderDisclosure("OpenAI-compatible", null, true), /will not be used/)
})

test("known privacy routes describe their enforced request", () => {
  assert.match(angelProviderDisclosure("OpenRouter", "no-data-collection", true), /deny provider data collection/)
  assert.match(angelProviderDisclosure("Vercel AI Gateway", "zero-data-retention", true), /zero data retention/)
})
