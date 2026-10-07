import { ANGEL_DEFAULT_MODEL } from "@/lib/angel-ai"

// Which AI endpoint Angel uses. A Groq key, when set, is used directly; then an OpenRouter key (asked
// to use only providers that do not keep or train on prompts). Otherwise, on Vercel, Angel
// uses Vercel AI Gateway, which authenticates with the deployment's own OIDC token (no key to
// manage) and is asked to route the same open model to Groq first.

export interface AngelProvider {
  name: "Groq" | "OpenRouter" | "Vercel AI Gateway"
  url: string
  token: string
  model: string
  fastModel?: string
  reasoningModel?: string
  /** Provider-specific request fields merged into every chat completion request. */
  extraBody: Record<string, unknown>
}

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
    return {
      name: "Vercel AI Gateway",
      url: "https://ai-gateway.vercel.sh/v1/chat/completions",
      token: gatewayToken,
      model: env.ANGEL_GATEWAY_MODEL || ANGEL_DEFAULT_MODEL,
      fastModel: env.ANGEL_GATEWAY_FAST_MODEL,
      reasoningModel: env.ANGEL_GATEWAY_REASONING_MODEL,
      extraBody: { providerOptions: { gateway: { order: ["groq"] } } },
    }
  }
  return null
}

export function modelForAngelTask(provider: AngelProvider, task: "quick" | "resource" | "reasoning"): string {
  if (task === "reasoning") return provider.reasoningModel || provider.model
  if (task === "quick" || task === "resource") return provider.fastModel || provider.model
  return provider.model
}
