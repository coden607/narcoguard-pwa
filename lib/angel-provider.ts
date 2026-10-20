import { ANGEL_DEFAULT_MODEL, ANGEL_GATEWAY_DEFAULT_MODEL } from "@/lib/angel-ai"

// Angel prefers OpenRouter, then any explicitly configured OpenAI-compatible endpoint.
// Groq, Kimi, and Vercel AI Gateway remain fallbacks so existing deployments keep working.
// In strict privacy mode only routes with enforceable retention controls are accepted.

export interface AngelEndpoint {
  name: AngelProvider["name"]
  url: string
  token: string
}

export interface AngelModelChoice {
  model: string
  privacy?: AngelPrivacy
  extraBody: Record<string, unknown>
  /** A different endpoint than the provider's own, for a fallback on another service. */
  endpoint?: AngelEndpoint
  /** Name of the reply-length field this endpoint expects (default max_completion_tokens). */
  tokenParam?: "max_tokens" | "max_completion_tokens"
}

export type AngelPrivacy = "zero-data-retention" | "no-data-collection" | "provider-policy" | "unverified"

export interface AngelProvider {
  name: "OpenRouter" | "OpenAI-compatible" | "Groq" | "Kimi" | "Vercel AI Gateway"
  url: string
  token: string
  model: string
  privacy: AngelPrivacy
  fastModel?: string
  reasoningModel?: string
  /** Provider-specific request fields merged into every chat completion request. */
  extraBody: Record<string, unknown>
  /** Request fields for a specific model, when they depend on it (gateway routing and retention). */
  extraBodyFor?: (model: string) => Record<string, unknown>
  tokenParam?: AngelModelChoice["tokenParam"]
  /** Same-service models tried in order when the account cannot use the configured one. */
  fallbacks?: AngelModelChoice[]
  /** Another configured service tried after this one fails. */
  next?: AngelProvider
}

export const KIMI_DEFAULT_MODEL = "kimi-k2-turbo-preview"
export const KIMI_DEFAULT_URL = "https://api.moonshot.ai/v1/chat/completions"
const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1"

const gatewayExtraBody = (model: string): Record<string, unknown> =>
  model.startsWith("openai/gpt-oss")
    ? { providerOptions: { gateway: { order: ["groq"] } } }
    : { providerOptions: { gateway: { zeroDataRetention: true } } }

type Env = Record<string, string | undefined>

function gatewayProvider(env: Env, oidcHeader: string | null): AngelProvider | null {
  const gatewayToken = env.AI_GATEWAY_API_KEY || oidcHeader || env.VERCEL_OIDC_TOKEN
  if (!gatewayToken) return null
  const model = env.ANGEL_GATEWAY_MODEL || ANGEL_GATEWAY_DEFAULT_MODEL
  return {
    name: "Vercel AI Gateway",
    url: "https://ai-gateway.vercel.sh/v1/chat/completions",
    token: gatewayToken,
    model,
    privacy: "provider-policy",
    fastModel: env.ANGEL_GATEWAY_FAST_MODEL,
    reasoningModel: env.ANGEL_GATEWAY_REASONING_MODEL,
    extraBody: gatewayExtraBody(model),
    extraBodyFor: gatewayExtraBody,
    fallbacks: model === ANGEL_DEFAULT_MODEL ? [] : [{ model: ANGEL_DEFAULT_MODEL, extraBody: gatewayExtraBody(ANGEL_DEFAULT_MODEL) }],
  }
}

function groqProvider(env: Env): AngelProvider | null {
  if (!env.GROQ_API_KEY) return null
  const model = env.GROQ_MODEL || ANGEL_DEFAULT_MODEL
  return {
    name: "Groq",
    url: "https://api.groq.com/openai/v1/chat/completions",
    token: env.GROQ_API_KEY,
    model,
    privacy: "provider-policy",
    fastModel: env.GROQ_FAST_MODEL,
    reasoningModel: env.GROQ_REASONING_MODEL,
    extraBody: model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {},
  }
}

function openRouterProvider(env: Env): AngelProvider | null {
  if (!env.OPENROUTER_API_KEY) return null
  return {
    name: "OpenRouter",
    url: "https://openrouter.ai/api/v1/chat/completions",
    token: env.OPENROUTER_API_KEY,
    model: env.OPENROUTER_MODEL || ANGEL_DEFAULT_MODEL,
    privacy: "no-data-collection",
    fastModel: env.OPENROUTER_FAST_MODEL,
    reasoningModel: env.OPENROUTER_REASONING_MODEL,
    extraBody: { provider: { data_collection: "deny" } },
  }
}

function completionEndpoint(baseUrl: string): string {
  const base = baseUrl.trim().replace(/\/+$/, "")
  return base.endsWith("/chat/completions") ? base : `${base}/chat/completions`
}

function openAICompatibleProvider(env: Env): AngelProvider | null {
  const token = env.OPENAI_COMPAT_API_KEY || env.OPENAI_API_KEY
  const model = env.OPENAI_COMPAT_MODEL || env.OPENAI_MODEL
  if (!token || !model) return null

  // OPENAI_API_KEY gets the official OpenAI endpoint automatically. Generic keys
  // require an explicit base URL so they can target Gemini, Grok, or another
  // OpenAI-compatible service without guessing where credentials should be sent.
  const baseUrl = env.OPENAI_COMPAT_BASE_URL || (env.OPENAI_API_KEY ? OPENAI_DEFAULT_BASE_URL : "")
  if (!baseUrl) return null

  return {
    name: "OpenAI-compatible",
    url: completionEndpoint(baseUrl),
    token,
    model,
    privacy: "provider-policy",
    fastModel: env.OPENAI_COMPAT_FAST_MODEL || env.OPENAI_FAST_MODEL,
    reasoningModel: env.OPENAI_COMPAT_REASONING_MODEL || env.OPENAI_REASONING_MODEL,
    extraBody: {},
    tokenParam: env.OPENAI_COMPAT_TOKEN_PARAM === "max_tokens" ? "max_tokens" : "max_completion_tokens",
  }
}

function kimiProvider(env: Env): AngelProvider | null {
  const token = env.MOONSHOT_API_KEY || env.KIMI_API_KEY
  if (!token) return null
  return {
    name: "Kimi",
    url: env.MOONSHOT_BASE_URL ? completionEndpoint(env.MOONSHOT_BASE_URL) : KIMI_DEFAULT_URL,
    token,
    model: env.KIMI_MODEL || KIMI_DEFAULT_MODEL,
    privacy: "unverified",
    fastModel: env.KIMI_FAST_MODEL,
    reasoningModel: env.KIMI_REASONING_MODEL,
    extraBody: {},
    tokenParam: "max_tokens",
  }
}

/** Links fallback services in order, skipping any that are not configured. */
function chain(...providers: (AngelProvider | null)[]): AngelProvider | undefined {
  const present = providers.filter((p): p is AngelProvider => p !== null)
  for (let i = present.length - 2; i >= 0; i--) present[i] = { ...present[i], next: present[i + 1] }
  return present[0]
}

export function resolveAngelProvider(env: Env, oidcHeader: string | null): AngelProvider | null {
  const strictPrivacy = env.ANGEL_PRIVACY_MODE === "strict"
  const gateway = gatewayProvider(env, oidcHeader)
  const openRouter = openRouterProvider(env)

  if (strictPrivacy && gateway) {
    return {
      ...gateway,
      privacy: "zero-data-retention",
      extraBody: { providerOptions: { gateway: { zeroDataRetention: true } } },
      extraBodyFor: () => ({ providerOptions: { gateway: { zeroDataRetention: true } } }),
      fallbacks: [],
      next: openRouter ?? undefined,
    }
  }
  if (strictPrivacy && openRouter) return openRouter
  if (strictPrivacy) return null

  return chain(
    openRouter,
    openAICompatibleProvider(env),
    groqProvider(env),
    kimiProvider(env),
    gateway,
  ) ?? null
}

export function modelForAngelTask(provider: AngelProvider, task: "quick" | "resource" | "reasoning"): string {
  if (task === "reasoning") return provider.reasoningModel || provider.model
  if (task === "quick" || task === "resource") return provider.fastModel || provider.model
  return provider.model
}

/** Model choices for a task, in the order to try them, ending with any next service's own choices. */
export function modelAttempts(provider: AngelProvider, task: "quick" | "resource" | "reasoning"): AngelModelChoice[] {
  const model = modelForAngelTask(provider, task)
  const first: AngelModelChoice = { model, privacy: provider.privacy, extraBody: provider.extraBodyFor?.(model) ?? provider.extraBody, ...(provider.tokenParam ? { tokenParam: provider.tokenParam } : {}) }
  const own = [first, ...(provider.fallbacks ?? []).filter((choice) => choice.model !== first.model).map((choice) => ({ ...choice, privacy: choice.privacy ?? provider.privacy }))]
  if (!provider.next) return own
  const endpoint = { name: provider.next.name, url: provider.next.url, token: provider.next.token }
  return [...own, ...modelAttempts(provider.next, task).map((choice) => ({ ...choice, endpoint: choice.endpoint ?? endpoint }))]
}

export const endpointFor = (provider: AngelProvider, choice: AngelModelChoice): AngelEndpoint =>
  choice.endpoint ?? { name: provider.name, url: provider.url, token: provider.token }

export const shouldTryFallback = (status: number, crossService = false) =>
  [400, 401, 403, 404].includes(status) || (crossService && [0, 402, 429, 500, 502, 503, 504].includes(status))

export function attemptTimeoutMs(deadline: number, attemptsLeft: number, now = Date.now(), cap = 25_000): number {
  return Math.max(3_000, Math.min(cap, Math.floor((deadline - now) / Math.max(1, attemptsLeft))))
}

export const COOLDOWN_MS = 10 * 60_000
const COOLDOWN_STATUSES = [401, 402, 403, 429]
const coolingDown = new Map<string, number>()
const cooldownKey = (endpoint: AngelEndpoint, model: string) => `${endpoint.url} ${model}`

export function noteRefusal(endpoint: AngelEndpoint, model: string, status: number, now = Date.now()) {
  if (COOLDOWN_STATUSES.includes(status)) coolingDown.set(cooldownKey(endpoint, model), now + COOLDOWN_MS)
}

export function isCoolingDown(endpoint: AngelEndpoint, model: string, now = Date.now()): boolean {
  const until = coolingDown.get(cooldownKey(endpoint, model))
  if (until === undefined) return false
  if (until <= now) {
    coolingDown.delete(cooldownKey(endpoint, model))
    return false
  }
  return true
}

export function availableAttempts(provider: AngelProvider, choices: AngelModelChoice[], now = Date.now()): AngelModelChoice[] {
  const ready = choices.filter((choice) => !isCoolingDown(endpointFor(provider, choice), choice.model, now))
  return ready.length > 0 ? ready : choices.slice(-1)
}
