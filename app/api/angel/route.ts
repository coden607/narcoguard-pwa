import { NextResponse } from "next/server"
import {
  angelRequestSchema,
  buildChatMessages,
  FIND_RESOURCES_TOOL,
  findResourcesArgsSchema,
  MAX_KINDS_PER_SEARCH,
  safetyNotices,
} from "@/lib/angel-ai"
import { resourcesForModel, toAngelResources, type AngelResources } from "@/lib/angel-resources"
import { orderByMaslow } from "@/lib/need-intent"
import { attemptTimeoutMs, availableAttempts, endpointFor, modelAttempts, noteRefusal, resolveAngelProvider, shouldTryFallback, type AngelModelChoice, type AngelProvider } from "@/lib/angel-provider"
import { routeAngelTurn } from "@/lib/angel-routing"
import { lookupKinds } from "@/lib/resource-lookup"

// Conversations are relayed to the AI provider to generate a reply and are not stored or logged by NarcoGuard.
// A shared location is used only to search public directories; it is never sent to the AI provider or logged.
// Upstream directories and the AI provider can be slow; allow time for one fallback attempt.
export const maxDuration = 60

const noStore = { "Cache-Control": "private, no-store" }

// Best-effort per-instance limit so one client cannot exhaust the free-tier quota.
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 12
const recent = new Map<string, number[]>()
function rateLimited(key: string, now = Date.now()) {
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  hits.push(now)
  recent.set(key, hits)
  if (recent.size > 5000) recent.clear()
  return hits.length > MAX_PER_WINDOW
}

type ChatMessage = { role: string; content: string | null; tool_calls?: ToolCall[]; tool_call_id?: string }
type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } }

class ProviderError extends Error {
  constructor(readonly status: number, readonly detail = "") { super(`provider ${status}`) }
}

/** The provider's machine-readable error type or code (for example "exceeded_current_quota_error"); never message text. */
function errorKind(detail: string): string {
  try {
    const error = (JSON.parse(detail) as { error?: { type?: unknown; code?: unknown } }).error
    const kind = typeof error?.type === "string" ? error.type : typeof error?.code === "string" ? error.code : ""
    return /^[\w.-]{1,60}$/.test(kind) ? ` ${kind}` : ""
  } catch {
    return ""
  }
}

async function complete(provider: AngelProvider, choice: AngelModelChoice, messages: ChatMessage[], withTools: boolean, maxTokens = 1024, temperature = 0.4, timeoutMs = 25_000) {
  const endpoint = endpointFor(provider, choice)
  // A network failure or timeout before any response counts as status 0, so another service can be tried.
  const response = await fetch(endpoint.url, {
    method: "POST",
    headers: { Authorization: `Bearer ${endpoint.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: choice.model,
      messages,
      temperature,
      [choice.tokenParam ?? "max_completion_tokens"]: maxTokens,
      ...choice.extraBody,
      ...(withTools ? { tools: [FIND_RESOURCES_TOOL], tool_choice: "auto" } : {}),
    }),
    signal: AbortSignal.timeout(timeoutMs),
  }).catch(() => { throw new ProviderError(0, "network or timeout") })
  // The provider's own error text (never our request content) helps diagnose access problems.
  if (!response.ok) throw new ProviderError(response.status, (await response.text().catch(() => "")).slice(0, 300))
  const body = (await response.json()) as { choices?: { message?: ChatMessage }[] }
  const message = body.choices?.[0]?.message
  if (!message) throw new ProviderError(0)
  return message
}

/**
 * Tries each model choice in order; a refusal (no access, unsupported) falls back to the next, and so
 * does any failure when the next choice is on another service. Every attempt shares one deadline.
 */
async function completeWithFallback(provider: AngelProvider, allChoices: AngelModelChoice[], messages: ChatMessage[], withTools: boolean, deadline: number, maxTokens?: number, temperature?: number) {
  // Skip models that just refused for account reasons, so replies are not slowed by a known refusal.
  const choices = availableAttempts(provider, allChoices)
  for (const [index, choice] of choices.entries()) {
    try {
      const timeoutMs = attemptTimeoutMs(deadline, choices.length - index)
      return { message: await complete(provider, choice, messages, withTools, maxTokens, temperature, timeoutMs), choice }
    } catch (error) {
      const last = index === choices.length - 1
      if (error instanceof ProviderError) noteRefusal(endpointFor(provider, choice), choice.model, error.status)
      const crossService = !last && endpointFor(provider, choices[index + 1]).url !== endpointFor(provider, choice).url
      if (last || !(error instanceof ProviderError && shouldTryFallback(error.status, crossService))) throw error
      console.warn(`[angel] ${endpointFor(provider, choice).name} refused ${choice.model} (${error.status}${errorKind(error.detail)}); trying ${endpointFor(provider, choices[index + 1]).name} ${choices[index + 1].model}`)
    }
  }
  throw new ProviderError(0)
}

const providerFor = (request: Request) => resolveAngelProvider(process.env, request.headers.get("x-vercel-oidc-token"))

export async function GET(request: Request) {
  const provider = providerFor(request)
  // Preview-only health probe with a fixed prompt (no user content) to verify provider access.
  if (new URL(request.url).searchParams.has("probe") && process.env.VERCEL_ENV !== "production") {
    if (!provider) return NextResponse.json({ ok: false, provider: null }, { headers: noStore })
    try {
      const { message: reply, choice } = await completeWithFallback(provider, modelAttempts(provider, "quick"), [{ role: "system", content: "Reply with the single word OK." }, { role: "user", content: "ping" }], false, Date.now() + (maxDuration - 5) * 1000, 64)
      return NextResponse.json({ ok: true, provider: provider.name, answeredBy: endpointFor(provider, choice).name, model: choice.model, configuredModel: provider.model, reply: reply.content?.slice(0, 40) ?? null }, { headers: noStore })
    } catch (error) {
      return NextResponse.json({ ok: false, provider: provider.name, status: error instanceof ProviderError ? error.status : "network", detail: error instanceof ProviderError ? error.detail : undefined }, { headers: noStore })
    }
  }
  return NextResponse.json({ available: Boolean(provider), provider: provider?.name ?? null }, { headers: noStore })
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  const provider = providerFor(request)
  if (!provider) return NextResponse.json({ available: false, message: "Angel AI is not configured yet." }, { status: 503, headers: noStore })

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(forwarded)) return NextResponse.json({ error: "Too many messages. Wait a minute and try again." }, { status: 429, headers: noStore })

  const parsed = angelRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid message." }, { status: 400, headers: noStore })

  const latest = parsed.data.messages.at(-1)
  const notices = latest?.role === "user" ? safetyNotices(latest.content) : []
  const messages: ChatMessage[] = buildChatMessages(parsed.data)
  const route = routeAngelTurn(latest?.content ?? "")

  try {
    // Overdose or crisis messages get the fastest possible reply: no directory searches before the 911/988 notice.
    const withTools = route.useTools && notices.length === 0
    // With tools, leave time for the directory search and the follow-up reply; without, use the whole budget.
    const firstDeadline = startedAt + (withTools ? 28 : maxDuration - 5) * 1000
    const first = await completeWithFallback(provider, modelAttempts(provider, route.task), messages, withTools, firstDeadline, route.maxTokens, route.temperature)
    let reply = first.message
    // The follow-up after a search uses whichever model answered, so a refused model is not tried twice.
    const used = [first.choice]
    let resources: AngelResources | undefined
    // Every find_resources call in the reply is answered; their needs are searched together in one lookup.
    const calls = (reply.tool_calls ?? []).filter((c) => c.function?.name === "find_resources").slice(0, 3)
    if (calls.length > 0) {
      const parsedCalls = calls.map((c) => {
        let args: unknown = null
        try { args = JSON.parse(c.function.arguments) } catch { /* invalid arguments are reported to the model below */ }
        return findResourcesArgsSchema.safeParse(args)
      })
      const valid = parsedCalls.flatMap((result) => (result.success ? [result.data] : []))
      const kinds = orderByMaslow(valid.flatMap((args) => args.kinds)).slice(0, MAX_KINDS_PER_SEARCH)
      const zip = valid.find((args) => args.zip)?.zip ?? parsed.data.zip
      const origin = zip ? { zip } : parsed.data.location
      let toolResult: unknown
      if (kinds.length === 0) toolResult = { error: "Give at least one known kind of place." }
      else if (!origin) toolResult = { error: "No location yet. Ask for a 5-digit ZIP code, or suggest tapping 'Use my location'." }
      else {
        // Leave time for the second completion (25 s timeout) within the 60 s route limit.
        resources = toAngelResources(await lookupKinds(kinds, origin, startedAt + (maxDuration - 30) * 1000))
        toolResult = resourcesForModel(resources)
      }
      messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: calls })
      // Every call gets an answer; the combined result is attached to the first so the model sees it once.
      calls.forEach((c, index) => messages.push({ role: "tool", tool_call_id: c.id, content: JSON.stringify(index === 0 ? toolResult : { note: "Combined with the first search." }) }))
      reply = (await completeWithFallback(provider, used, messages, false, startedAt + (maxDuration - 3) * 1000, route.maxTokens, route.temperature)).message
    }
    const text = reply.content?.trim() || "I couldn't put together a reply. Please try asking another way."
    return NextResponse.json({ available: true, notices, reply: text, resources }, { headers: noStore })
  } catch (error) {
    // Only the provider name and HTTP status are logged, never message content.
    console.warn(`[angel] ${provider.name} request failed: ${error instanceof ProviderError ? error.status : "network"}`)
    // Rejected credentials or an account not yet enabled (e.g. AI Gateway before a card is on file):
    // report Angel as switched off rather than as a temporary failure.
    if (error instanceof ProviderError && (error.status === 401 || error.status === 403)) {
      return NextResponse.json({ available: false, notices, message: "Angel AI is not switched on yet." }, { status: 503, headers: noStore })
    }
    return NextResponse.json({ available: true, notices, error: "Angel couldn't respond right now. Try again, or use the search below." }, { status: 502, headers: noStore })
  }
}
