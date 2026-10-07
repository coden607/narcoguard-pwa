import { NextResponse } from "next/server"
import { clientKey, isSameOrigin, readJson } from "@/lib/api-helpers"
import { modelForAngelTask, resolveAngelProvider } from "@/lib/angel-provider"
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
    const response = await fetch(provider.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${provider.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...provider.extraBody,
        model: modelForAngelTask(provider, "quick"),
        temperature: 0,
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: SYSTEM }, { role: "user", content: text }],
      }),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error(`provider ${response.status}`)
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
