import { strict as assert } from "node:assert"
import { test } from "node:test"
import { endpointFor, modelAttempts, resolveAngelProvider, shouldTryFallback } from "../lib/angel-provider"

test("a Groq key is used directly, with its own model override", () => {
  const provider = resolveAngelProvider({ GROQ_API_KEY: "k", GROQ_MODEL: "m", VERCEL_OIDC_TOKEN: "o" }, "h")
  assert.equal(provider?.name, "Groq")
  assert.equal(provider?.token, "k")
  assert.equal(provider?.model, "m")
  assert.deepEqual(provider?.extraBody, {})
})

test("without a Groq key, AI Gateway uses the request's OIDC token, Claude Sonnet 5 and zero data retention", () => {
  const provider = resolveAngelProvider({}, "oidc-from-header")
  assert.equal(provider?.name, "Vercel AI Gateway")
  assert.equal(provider?.url, "https://ai-gateway.vercel.sh/v1/chat/completions")
  assert.equal(provider?.token, "oidc-from-header")
  assert.equal(provider?.model, "anthropic/claude-sonnet-5")
  assert.deepEqual(provider?.extraBody, { providerOptions: { gateway: { zeroDataRetention: true } } })
})

test("an open gpt-oss model set for the gateway is still routed to Groq first", () => {
  const provider = resolveAngelProvider({ ANGEL_GATEWAY_MODEL: "openai/gpt-oss-120b" }, "h")
  assert.equal(provider?.model, "openai/gpt-oss-120b")
  assert.deepEqual(provider?.extraBody, { providerOptions: { gateway: { order: ["groq"] } } })
})

test("an explicit gateway key wins over OIDC, and the env OIDC token is a fallback", () => {
  assert.equal(resolveAngelProvider({ AI_GATEWAY_API_KEY: "g" }, "h")?.token, "g")
  assert.equal(resolveAngelProvider({ VERCEL_OIDC_TOKEN: "e" }, null)?.token, "e")
})

test("no credentials means Angel is reported unavailable", () => {
  assert.equal(resolveAngelProvider({}, null), null)
})

test("an OpenRouter key is used when there is no Groq key, and asks for no-retention providers", () => {
  const provider = resolveAngelProvider({ OPENROUTER_API_KEY: "or", VERCEL_OIDC_TOKEN: "o" }, "h")
  assert.equal(provider?.name, "OpenRouter")
  assert.equal(provider?.url, "https://openrouter.ai/api/v1/chat/completions")
  assert.equal(provider?.token, "or")
  assert.equal(provider?.model, "openai/gpt-oss-120b")
  assert.deepEqual(provider?.extraBody, { provider: { data_collection: "deny" } })
  assert.equal(resolveAngelProvider({ OPENROUTER_API_KEY: "or", OPENROUTER_MODEL: "x/y" }, null)?.model, "x/y")
  assert.equal(resolveAngelProvider({ GROQ_API_KEY: "k", OPENROUTER_API_KEY: "or" }, null)?.name, "Groq", "a Groq key still wins")
})

test("the gateway falls back to the open model when the account cannot use Claude", () => {
  const provider = resolveAngelProvider({}, "h")!
  const attempts = modelAttempts(provider, "resource")
  assert.deepEqual(attempts.map((a) => a.model), ["anthropic/claude-sonnet-5", "openai/gpt-oss-120b"])
  assert.deepEqual(attempts[1].extraBody, { providerOptions: { gateway: { order: ["groq"] } } })
  assert.equal(shouldTryFallback(403), true, "free tier: no access to the model")
  assert.equal(shouldTryFallback(429), false, "rate limits are not a reason to switch models")
  assert.equal(shouldTryFallback(500), false)
  assert.equal(modelAttempts(resolveAngelProvider({ ANGEL_GATEWAY_MODEL: "openai/gpt-oss-120b" }, "h")!, "quick").length, 1, "no fallback to itself")
  assert.equal(modelAttempts(resolveAngelProvider({ GROQ_API_KEY: "k" }, null)!, "quick").length, 1, "direct Groq has no fallback")
})

test("a Kimi key goes first, with the gateway chain as a cross-service fallback", () => {
  const provider = resolveAngelProvider({ MOONSHOT_API_KEY: "mk" }, "oidc")!
  assert.equal(provider.name, "Kimi")
  assert.equal(provider.url, "https://api.moonshot.ai/v1/chat/completions")
  assert.equal(provider.model, "kimi-k2-turbo-preview")
  const attempts = modelAttempts(provider, "resource")
  assert.deepEqual(attempts.map((a) => [a.endpoint?.name ?? "Kimi", a.model]), [
    ["Kimi", "kimi-k2-turbo-preview"],
    ["Vercel AI Gateway", "anthropic/claude-sonnet-5"],
    ["Vercel AI Gateway", "openai/gpt-oss-120b"],
  ])
  assert.equal(attempts[0].tokenParam, "max_tokens", "Moonshot expects max_tokens")
  assert.equal(endpointFor(provider, attempts[0]).token, "mk")
  assert.equal(endpointFor(provider, attempts[1]).token, "oidc")
  assert.equal(resolveAngelProvider({ KIMI_API_KEY: "k2", KIMI_MODEL: "kimi-x", MOONSHOT_BASE_URL: "https://api.moonshot.cn/v1/" }, null)?.url, "https://api.moonshot.cn/v1/chat/completions")
  assert.equal(modelAttempts(resolveAngelProvider({ KIMI_API_KEY: "k2" }, null)!, "quick").length, 1, "no gateway, no fallback")
  assert.equal(resolveAngelProvider({ MOONSHOT_API_KEY: "mk", GROQ_API_KEY: "g" }, null)?.name, "Kimi", "the owner's Kimi credits win")
})

test("running out of Kimi credit switches services, but rate limits never switch models on one service", () => {
  assert.equal(shouldTryFallback(429, true), true)
  assert.equal(shouldTryFallback(402, true), true)
  assert.equal(shouldTryFallback(503, true), true)
  assert.equal(shouldTryFallback(429), false)
  assert.equal(shouldTryFallback(401), true)
})
