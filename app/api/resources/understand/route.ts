import { NextResponse } from "next/server"
import { clientKey, isSameOrigin, readJson } from "@/lib/api-helpers"
import { attemptTimeoutMs, availableAttempts, endpointFor, modelAttempts, noteRefusal, resolveAngelProvider, shouldTryFallback } from "@/lib/angel-provider"
import { safetyNotices } from "@/lib/angel-ai"
import { parseKindList } from "@/lib/need-intent"
import { RESOURCE_KINDS, RESOURCE_LABELS } from "@/lib/resource-finder"

// Optional AI matching of a person's own words to resource kinds, used only after they tap for it.
// The text goes to the configured AI provider for this one request and is never stored or logged.

export const dynamic = "force-dynamic"
const noStore = { "Cache-Control": "private, no-store" }
const MAX_CHARS = 500

const recent = new Map<string, number[]>()
const limited = (key: string) => {
  const now = Date.now()
  const hits = (recent.get(key) ?? []).filter((at) => now - at < 60_000)
  hits.push(now)
  recent.set(key, hits)
  return hits.length > 10
}

// Up to three provider attempts share one 50-second deadline.
export const maxDuration = 60

const providerFor = (request: Request) => resolveAngelProvider(process.env, request.headers.get("x-vercel-oidc-token"))

export async function GET(request: Request) {
  const provider = providerFor(request)
  return NextResponse.json({ available: Boolean(provider), provider: provider?.name ?? null }, { headers: noStore })
}

const SYSTEM = [
  "You map a person's description of what they need to a list of resource categories.",
  `Allowed categories (id: meaning): ${RESOURCE_KINDS.map((kind) => `${kind}: ${RESOURCE_LABELS[kind]}`).join("; ")}.`,
  'Reply with JSON only, exactly {"kinds": [ids]}. Include every category the person asks for or clearly needs, nothing else.',
  'If nothing fits, reply {"kinds": []}. Never add advice or text.',
].join(" ")

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403, headers: noStore })
  if (limited(clientKey(request))) return NextResponse.json({ error: "Too many requests. Try again in a minute." }, { status: 429, headers: noStore })
  const provider = providerFor(request)
  if (!provider) return NextResponse.json({ error: "AI matching is not switched on." }, { status: 503, headers: noStore })
  const body = await readJson(request)
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_CHARS) : ""
  if (!text) return NextResponse.json({ error: "Describe what you need." }, { status: 400, headers: noStore })
  const notices = safetyNotices(text)

  try {
    // The configured model first, then the open fallback if this account cannot use it.
    let response: Response | undefined
    const attempts = availableAttempts(provider, modelAttempts(provider, "quick"))
    const deadline = Date.now() + 50_000
    for (const [index, choice] of attempts.entries()) {
      const endpoint = endpointFor(provider, choice)
      const next = attempts[index + 1]
      const crossService = Boolean(next) && endpointFor(provider, next).url !== endpoint.url
      // A network failure or timeout moves on to another service; on the same service it ends the search.
      const result = await fetch(endpoint.url, {
        method: "POST",
        headers: { Authorization: `Bearer ${endpoint.token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          ...choice.extraBody,
          model: choice.model,
          temperature: 0,
          max_tokens: 200,
          response_format: { type: "json_object" },
          messages: [{ role: "system", content: SYSTEM }, { role: "user", content: text }],
        }),
        signal: AbortSignal.timeout(attemptTimeoutMs(deadline, attempts.length - index, Date.now(), 20_000)),
      }).catch((error: unknown) => {
        if (crossService) return undefined
        throw error
      })
      if (!result) continue
      response = result
      if (!response.ok) noteRefusal(endpoint, choice.model, response.status)
      if (response.ok || !next || !shouldTryFallback(response.status, crossService)) break
    }
    if (!response?.ok) throw new Error(`provider ${response?.status ?? 0}`)
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
    const content = data.choices?.[0]?.message?.content ?? ""
    let parsed: unknown = null
    try {
      parsed = JSON.parse(content.slice(content.indexOf("{"), content.lastIndexOf("}") + 1))
    } catch {
      parsed = null
    }
    return NextResponse.json({ kinds: parseKindList(parsed), provider: provider.name, notices }, { headers: noStore })
  } catch (error) {
    // Only the provider name and failure kind are logged, never the person's words.
    console.warn(`[understand] ${provider.name} request failed: ${error instanceof Error ? error.message : "unknown"}`)
    return NextResponse.json({ error: "AI matching did not respond. Pick your needs from the list instead.", notices }, { status: 502, headers: noStore })
  }
}
