import { ANGEL_DEFAULT_MODEL, ANGEL_GATEWAY_DEFAULT_MODEL } from "@/lib/angel-ai"

// Which AI endpoint Angel uses. A Moonshot (Kimi) key, when set, is used first, with the gateway below as
// its fallback so Angel keeps working if Kimi refuses (credits, key, model). Then a Groq key is used directly; then an OpenRouter key (asked
// to use only providers that do not keep or train on prompts). Otherwise, on Vercel, Angel
// uses Vercel AI Gateway, which authenticates with the deployment's own OIDC token (no key to
// manage). There it runs a frontier model with zero data retention required; an open gpt-oss
// model set through ANGEL_GATEWAY_MODEL is routed to Groq first, as before.

export interface AngelEndpoint {
  name: AngelProvider["name"]
  url: string
  token: string
}

export interface AngelModelChoice {
  model: string
  extraBody: Record<string, unknown>
  /** A different endpoint than the provider's own, for a fallback on another service. */
  endpoint?: AngelEndpoint
  /** Name of the reply-length field this endpoint expects (default max_completion_tokens). */
  tokenParam?: "max_tokens" | "max_completion_tokens"
}

export interface AngelProvider {
  name: "Kimi" | "Groq" | "OpenRouter" | "Vercel AI Gateway"
  url: string
  token: string
  model: string
  fastModel?: string
  reasoningModel?: string
  /** Provider-specific request fields merged into every chat completion request. */
  extraBody: Record<string, unknown>
  /** Request fields for a specific model, when they depend on it (gateway routing and retention). */
  extraBodyFor?: (model: string) => Record<string, unknown>
  tokenParam?: AngelModelChoice["tokenParam"]
  /** Same-service models tried in order when the account cannot use the configured one (for example a gateway free tier). */
  fallbacks?: AngelModelChoice[]
  /** Another service tried after this one fails, with its own task-specific models (Kimi falls back to the gateway). */
  next?: AngelProvider
}

export const KIMI_DEFAULT_MODEL = "kimi-k2-turbo-preview"
export const KIMI_DEFAULT_URL = "https://api.moonshot.ai/v1/chat/completions"

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
    fastModel: env.ANGEL_GATEWAY_FAST_MODEL,
    reasoningModel: env.ANGEL_GATEWAY_REASONING_MODEL,
    extraBody: gatewayExtraBody(model),
    extraBodyFor: gatewayExtraBody,
    // Frontier models need paid gateway credits; until then Angel keeps working on the open model.
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
    fastModel: env.GROQ_FAST_MODEL,
    reasoningModel: env.GROQ_REASONING_MODEL,
    extraBody: model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {},
  }
}

/** Links fallback services in order, skipping any that are not configured. */
function chain(...providers: (AngelProvider | null)[]): AngelProvider | undefined {
  const present = providers.filter((p): p is AngelProvider => p !== null)
  for (let i = 0; i < present.length - 1; i++) present[i] = { ...present[i], next: present[i + 1] }
  return present[0]
}

export function resolveAngelProvider(env: Env, oidcHeader: string | null): AngelProvider | null {
  const kimiKey = env.MOONSHOT_API_KEY || env.KIMI_API_KEY
  if (kimiKey) {
    // The gateway (when this deployment has one) catches anything Kimi refuses, so Angel stays on.
    return {
      name: "Kimi",
      url: env.MOONSHOT_BASE_URL ? `${env.MOONSHOT_BASE_URL.replace(/\/+$/, "")}/chat/completions` : KIMI_DEFAULT_URL,
      token: kimiKey,
      model: env.KIMI_MODEL || KIMI_DEFAULT_MODEL,
      fastModel: env.KIMI_FAST_MODEL,
      reasoningModel: env.KIMI_REASONING_MODEL,
      extraBody: {},
      tokenParam: "max_tokens",
      // A free Groq key (when set) answers before the gateway, then the gateway chain catches anything left.
      next: chain(groqProvider(env), gatewayProvider(env, oidcHeader)),
    }
  }
  const groq = groqProvider(env)
  if (groq) return groq
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
  return gatewayProvider(env, oidcHeader)
}

export function modelForAngelTask(provider: AngelProvider, task: "quick" | "resource" | "reasoning"): string {
  if (task === "reasoning") return provider.reasoningModel || provider.model
  if (task === "quick" || task === "resource") return provider.fastModel || provider.model
  return provider.model
}

/** Model choices for a task, in the order to try them, ending with any next service's own choices. */
export function modelAttempts(provider: AngelProvider, task: "quick" | "resource" | "reasoning"): AngelModelChoice[] {
  const model = modelForAngelTask(provider, task)
  const first: AngelModelChoice = { model, extraBody: provider.extraBodyFor?.(model) ?? provider.extraBody, ...(provider.tokenParam ? { tokenParam: provider.tokenParam } : {}) }
  const own = [first, ...(provider.fallbacks ?? []).filter((choice) => choice.model !== first.model)]
  if (!provider.next) return own
  const endpoint = { name: provider.next.name, url: provider.next.url, token: provider.next.token }
  return [...own, ...modelAttempts(provider.next, task).map((choice) => ({ ...choice, endpoint: choice.endpoint ?? endpoint }))]
}

/** Where a choice is sent: its own endpoint for a cross-service fallback, else the provider's. */
export const endpointFor = (provider: AngelProvider, choice: AngelModelChoice): AngelEndpoint =>
  choice.endpoint ?? { name: provider.name, url: provider.url, token: provider.token }

/**
 * Statuses where the next choice may still work. On the same service only a refusal of the model
 * (no access, unsupported) switches models; a different service is also tried when this one is out
 * of credit (402, or 429 when a balance runs out), rate-limited, down or unreachable (0: network
 * error or timeout before any response).
 */
export const shouldTryFallback = (status: number, crossService = false) =>
  [400, 401, 403, 404].includes(status) || (crossService && [0, 402, 429, 500, 502, 503, 504].includes(status))

/**
 * Time for one attempt so the whole chain finishes by the deadline: an even share of what is left,
 * at most the usual per-request limit and never less than a few seconds.
 */
export function attemptTimeoutMs(deadline: number, attemptsLeft: number, now = Date.now(), cap = 25_000): number {
  return Math.max(3_000, Math.min(cap, Math.floor((deadline - now) / Math.max(1, attemptsLeft))))
}

/**
 * Models that refused for account reasons (no access, no credit, rate limit) are skipped for a while,
 * so every message does not wait on a refusal first. Per server instance, in memory only; the last
 * choice in a chain is always tried, so Angel never skips everything.
 */
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

/** Choices worth trying now: those not cooling down, but never an empty list. */
export function availableAttempts(provider: AngelProvider, choices: AngelModelChoice[], now = Date.now()): AngelModelChoice[] {
  const ready = choices.filter((choice) => !isCoolingDown(endpointFor(provider, choice), choice.model, now))
  return ready.length > 0 ? ready : choices.slice(-1)
}
