import { strict as assert } from "node:assert"
import { test } from "node:test"
import { attemptTimeoutMs, endpointFor, modelAttempts, resolveAngelProvider, shouldTryFallback } from "../lib/angel-provider"

test("OpenRouter is the primary non-strict provider and requests no data collection", () => {
  const provider = resolveAngelProvider({
    OPENROUTER_API_KEY: "or",
    OPENROUTER_MODEL: "x/y",
    OPENAI_API_KEY: "oa",
    OPENAI_MODEL: "gpt-test",
    GROQ_API_KEY: "g",
    MOONSHOT_API_KEY: "mk",
  }, "oidc")
  assert.equal(provider?.name, "OpenRouter")
  assert.equal(provider?.url, "https://openrouter.ai/api/v1/chat/completions")
  assert.equal(provider?.token, "or")
  assert.equal(provider?.model, "x/y")
  assert.deepEqual(provider?.extraBody, { provider: { data_collection: "deny" } })
  assert.deepEqual(modelAttempts(provider!, "quick").map((a) => a.endpoint?.name ?? provider!.name), [
    "OpenRouter",
    "OpenAI-compatible",
    "Groq",
    "Kimi",
    "Vercel AI Gateway",
    "Vercel AI Gateway",
  ])
})

test("a generic OpenAI-compatible key can target Gemini, Grok, or another compatible endpoint", () => {
  const provider = resolveAngelProvider({
    OPENAI_COMPAT_API_KEY: "compatible-key",
    OPENAI_COMPAT_BASE_URL: "https://llm.example.test/v1/",
    OPENAI_COMPAT_MODEL: "provider/model",
    OPENAI_COMPAT_FAST_MODEL: "provider/fast",
    OPENAI_COMPAT_REASONING_MODEL: "provider/reasoning",
    OPENAI_COMPAT_TOKEN_PARAM: "max_tokens",
  }, null)
  assert.equal(provider?.name, "OpenAI-compatible")
  assert.equal(provider?.url, "https://llm.example.test/v1/chat/completions")
  assert.equal(provider?.token, "compatible-key")
  assert.equal(provider?.model, "provider/model")
  assert.equal(modelAttempts(provider!, "quick")[0].model, "provider/fast")
  assert.equal(modelAttempts(provider!, "reasoning")[0].model, "provider/reasoning")
  assert.equal(modelAttempts(provider!, "quick")[0].tokenParam, "max_tokens")
})

test("OPENAI_API_KEY uses the official OpenAI endpoint but still requires an explicit model", () => {
  assert.equal(resolveAngelProvider({ OPENAI_API_KEY: "oa" }, null), null)
  const provider = resolveAngelProvider({ OPENAI_API_KEY: "oa", OPENAI_MODEL: "gpt-current" }, null)
  assert.equal(provider?.name, "OpenAI-compatible")
  assert.equal(provider?.url, "https://api.openai.com/v1/chat/completions")
  assert.equal(provider?.model, "gpt-current")
  assert.equal(modelAttempts(provider!, "quick")[0].tokenParam, "max_completion_tokens")
})

test("a generic compatibility key is ignored without both a base URL and model", () => {
  assert.equal(resolveAngelProvider({ OPENAI_COMPAT_API_KEY: "k", OPENAI_COMPAT_MODEL: "m" }, null), null)
  assert.equal(resolveAngelProvider({ OPENAI_COMPAT_API_KEY: "k", OPENAI_COMPAT_BASE_URL: "https://example.test/v1" }, null), null)
})

test("Groq remains a direct fallback with its own model override", () => {
  const provider = resolveAngelProvider({ GROQ_API_KEY: "k", GROQ_MODEL: "m" }, null)
  assert.equal(provider?.name, "Groq")
  assert.equal(provider?.token, "k")
  assert.equal(provider?.model, "m")
  assert.deepEqual(provider?.extraBody, {})
})

test("AI Gateway uses the request OIDC token when no earlier provider is configured", () => {
  const provider = resolveAngelProvider({}, "oidc-from-header")
  assert.equal(provider?.name, "Vercel AI Gateway")
  assert.equal(provider?.url, "https://ai-gateway.vercel.sh/v1/chat/completions")
  assert.equal(provider?.token, "oidc-from-header")
  assert.deepEqual(provider?.extraBody, { providerOptions: { gateway: { zeroDataRetention: true } } })
})

test("an explicit gateway key wins over OIDC, and env OIDC is a fallback", () => {
  assert.equal(resolveAngelProvider({ AI_GATEWAY_API_KEY: "g" }, "h")?.token, "g")
  assert.equal(resolveAngelProvider({ VERCEL_OIDC_TOKEN: "e" }, null)?.token, "e")
})

test("strict privacy keeps gateway first and OpenRouter as the only cross-service fallback", () => {
  const provider = resolveAngelProvider({
    ANGEL_PRIVACY_MODE: "strict",
    OPENROUTER_API_KEY: "or",
    OPENAI_API_KEY: "oa",
    OPENAI_MODEL: "gpt-current",
    GROQ_API_KEY: "g",
    MOONSHOT_API_KEY: "mk",
  }, "oidc")!
  assert.equal(provider.name, "Vercel AI Gateway")
  assert.equal(provider.privacy, "zero-data-retention")
  assert.equal(provider.next?.name, "OpenRouter")
  assert.equal(provider.next?.next, undefined)
  assert.deepEqual(provider.extraBody, { providerOptions: { gateway: { zeroDataRetention: true } } })
})

test("strict privacy uses OpenRouter alone when gateway auth is unavailable", () => {
  const provider = resolveAngelProvider({ ANGEL_PRIVACY_MODE: "strict", OPENROUTER_API_KEY: "or", GROQ_API_KEY: "g" }, null)
  assert.equal(provider?.name, "OpenRouter")
  assert.equal(provider?.next, undefined)
})

test("strict privacy rejects providers without an enforceable retention control", () => {
  assert.equal(resolveAngelProvider({ ANGEL_PRIVACY_MODE: "strict", OPENAI_API_KEY: "oa", OPENAI_MODEL: "m", GROQ_API_KEY: "g", MOONSHOT_API_KEY: "mk" }, null), null)
})

test("Kimi remains available as a legacy fallback and uses max_tokens", () => {
  const provider = resolveAngelProvider({ MOONSHOT_API_KEY: "mk" }, "oidc")!
  assert.equal(provider.name, "Kimi")
  assert.equal(provider.url, "https://api.moonshot.ai/v1/chat/completions")
  assert.equal(provider.model, "kimi-k2-turbo-preview")
  const attempts = modelAttempts(provider, "resource")
  assert.deepEqual(attempts.map((a) => [a.endpoint?.name ?? provider.name, a.model]), [
    ["Kimi", "kimi-k2-turbo-preview"],
    ["Vercel AI Gateway", "anthropic/claude-sonnet-5"],
    ["Vercel AI Gateway", "openai/gpt-oss-120b"],
  ])
  assert.equal(attempts[0].tokenParam, "max_tokens")
  assert.equal(endpointFor(provider, attempts[0]).token, "mk")
  assert.equal(endpointFor(provider, attempts[1]).token, "oidc")
})

test("fallback chain preserves every configured provider in priority order", () => {
  const provider = resolveAngelProvider({
    OPENAI_API_KEY: "oa",
    OPENAI_MODEL: "gpt-current",
    GROQ_API_KEY: "gk",
    MOONSHOT_API_KEY: "mk",
  }, "oidc")!
  assert.deepEqual(modelAttempts(provider, "quick").map((a) => a.endpoint?.name ?? provider.name), [
    "OpenAI-compatible",
    "Groq",
    "Kimi",
    "Vercel AI Gateway",
    "Vercel AI Gateway",
  ])
})

test("no credentials means Angel is unavailable", () => {
  assert.equal(resolveAngelProvider({}, null), null)
})

test("cross-service failures can fall through while same-service rate limits do not switch models", () => {
  assert.equal(shouldTryFallback(429, true), true)
  assert.equal(shouldTryFallback(402, true), true)
  assert.equal(shouldTryFallback(503, true), true)
  assert.equal(shouldTryFallback(0, true), true)
  assert.equal(shouldTryFallback(429), false)
  assert.equal(shouldTryFallback(500), false)
  assert.equal(shouldTryFallback(401), true)
})

test("attempt timeouts share one deadline", () => {
  const now = 1_000_000
  assert.equal(attemptTimeoutMs(now + 55_000, 3, now), 18_333)
  assert.equal(attemptTimeoutMs(now + 55_000, 1, now), 25_000)
  assert.equal(attemptTimeoutMs(now + 1_000, 2, now), 3_000)
  let total = 0
  for (let left = 3; left > 0; left--) total += attemptTimeoutMs(now + 55_000 - total, left, now)
  assert.ok(total <= 55_000)
})

test("refused models cool down temporarily but the chain is never empty", async () => {
  const { availableAttempts, noteRefusal, COOLDOWN_MS } = await import("../lib/angel-provider")
  const provider = resolveAngelProvider({ MOONSHOT_API_KEY: "mk-cooldown" }, "oidc-cooldown")!
  const all = modelAttempts(provider, "quick")
  const now = 5_000_000
  noteRefusal(endpointFor(provider, all[0]), all[0].model, 429, now)
  noteRefusal(endpointFor(provider, all[1]), all[1].model, 403, now)
  assert.deepEqual(availableAttempts(provider, all, now + 1).map((a) => a.model), ["openai/gpt-oss-120b"])
  noteRefusal(endpointFor(provider, all[2]), all[2].model, 429, now)
  assert.equal(availableAttempts(provider, all, now + 1).length, 1)
  assert.equal(availableAttempts(provider, all, now + COOLDOWN_MS + 1).length, 3)
})
