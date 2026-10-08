import { ANGEL_DEFAULT_MODEL, ANGEL_GATEWAY_DEFAULT_MODEL } from "@/lib/angel-ai"

// Which AI endpoint Angel uses. A Groq key, when set, is used directly; then an OpenRouter key (asked
// to use only providers that do not keep or train on prompts). Otherwise, on Vercel, Angel
// uses Vercel AI Gateway, which authenticates with the deployment's own OIDC token (no key to
// manage). There it runs a frontier model with zero data retention required; an open gpt-oss
// model set through ANGEL_GATEWAY_MODEL is routed to Groq first, as before.

export interface AngelModelChoice {
  model: string
  extraBody: Record<string, unknown>
}

export interface AngelProvider {
  name: "Groq" | "OpenRouter" | "Vercel AI Gateway"
  url: string
  token: string
  model: string
  fastModel?: string
  reasoningModel?: string
  /** Provider-specific request fields merged into every chat completion request. */
  extraBody: Record<string, unknown>
  /** Tried when the account cannot use the configured model (for example a gateway free tier). */
  fallback?: AngelModelChoice
}

const gatewayExtraBody = (model: string): Record<string, unknown> =>
  model.startsWith("openai/gpt-oss")
    ? { providerOptions: { gateway: { order: ["groq"] } } }
    : { providerOptions: { gateway: { zeroDataRetention: true } } }

type Env = Record<string, string | undefined>

export function resolveAngelProvider(env: Env, oidcHeader: string | null): AngelProvider | null {
  if (env.GROQ_API_KEY) {
    const model = env.GROQ_MODEL || ANGEL_DEFAULT_MODEL
    return {
      name: "Groq",
      url: "https://api.groq.com/openai/v1/chat/completions",
      token: env.GROQ_API_KEY,
      model,
      fastModel: env.GROQ_FAST_MODEL,
      reasoningModel: env.GROQ_REASONING_MODEL,
      extraBody: model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {},
    }
  }
  if (env.OPENROUTER_API_KEY) {
    return {
      name: "OpenRouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      token: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL || ANGEL_DEFAULT_MODEL,
      fastModel: env.OPENROUTER_FAST_MODEL,
      reasoningModel: env.OPENROUTER_REASONING_MODEL,
      // Route only to providers that do not store prompts or use them for training.
      extraBody: { provider: { data_collection: "deny" } },
    }
  }
  const gatewayToken = env.AI_GATEWAY_API_KEY || oidcHeader || env.VERCEL_OIDC_TOKEN
  if (gatewayToken) {
    const model = env.ANGEL_GATEWAY_MODEL || ANGEL_GATEWAY_DEFAULT_MODEL
    return {
      name: "Vercel AI Gateway",
      url: "https://ai-gateway.vercel.sh/v1/chat/completions",
      token: gatewayToken,
      model,
      fastModel: env.ANGEL_GATEWAY_FAST_MODEL,
      reasoningModel: env.ANGEL_GATEWAY_REASONING_MODEL,
      extraBody: gatewayExtraBody(model),
      // Frontier models need paid gateway credits; until then Angel keeps working on the open model.
      fallback: model === ANGEL_DEFAULT_MODEL ? undefined : { model: ANGEL_DEFAULT_MODEL, extraBody: gatewayExtraBody(ANGEL_DEFAULT_MODEL) },
    }
  }
  return null
}

export function modelForAngelTask(provider: AngelProvider, task: "quick" | "resource" | "reasoning"): string {
  if (task === "reasoning") return provider.reasoningModel || provider.model
  if (task === "quick" || task === "resource") return provider.fastModel || provider.model
  return provider.model
}

/** Model choices for a task, in the order to try them. */
export function modelAttempts(provider: AngelProvider, task: "quick" | "resource" | "reasoning"): AngelModelChoice[] {
  const first = { model: modelForAngelTask(provider, task), extraBody: provider.extraBody }
  return provider.fallback && provider.fallback.model !== first.model ? [first, provider.fallback] : [first]
}

/** Statuses that mean "this account or request cannot use this model", where the fallback may still work. */
export const shouldTryFallback = (status: number) => [400, 401, 403, 404].includes(status)
