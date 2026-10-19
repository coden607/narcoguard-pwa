import assert from "node:assert/strict"
import { test } from "node:test"
import { modelAttempts, resolveAngelProvider } from "../lib/angel-provider"

test("strict privacy mode prefers zero-retention gateway even when Kimi and Groq are configured", () => {
  const provider = resolveAngelProvider({
    ANGEL_PRIVACY_MODE: "strict",
    AI_GATEWAY_API_KEY: "gateway-key",
    ANGEL_GATEWAY_MODEL: "anthropic/claude-sonnet-5",
    MOONSHOT_API_KEY: "kimi-key",
    GROQ_API_KEY: "groq-key",
    OPENROUTER_API_KEY: "openrouter-key",
  }, null)
  assert.ok(provider)
  assert.equal(provider.name, "Vercel AI Gateway")
  assert.equal(provider.privacy, "zero-data-retention")
  const attempts = modelAttempts(provider, "reasoning")
  assert.equal(attempts.length, 1)
  assert.deepEqual(attempts[0].extraBody, { providerOptions: { gateway: { zeroDataRetention: true } } })
})

test("strict privacy mode uses no-data-collection OpenRouter only when gateway is unavailable", () => {
  const provider = resolveAngelProvider({
    ANGEL_PRIVACY_MODE: "strict",
    OPENROUTER_API_KEY: "openrouter-key",
    OPENROUTER_MODEL: "anthropic/claude-sonnet-5",
    MOONSHOT_API_KEY: "kimi-key",
    GROQ_API_KEY: "groq-key",
  }, null)
  assert.ok(provider)
  assert.equal(provider.name, "OpenRouter")
  assert.equal(provider.privacy, "no-data-collection")
  assert.deepEqual(provider.extraBody, { provider: { data_collection: "deny" } })
})

test("strict privacy mode refuses unverified-only configuration", () => {
  assert.equal(resolveAngelProvider({
    ANGEL_PRIVACY_MODE: "strict",
    MOONSHOT_API_KEY: "kimi-key",
    GROQ_API_KEY: "groq-key",
  }, null), null)
})
