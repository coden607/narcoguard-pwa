import { NextResponse } from "next/server"
import {
  ANGEL_DEFAULT_MODEL,
  angelRequestSchema,
  buildChatMessages,
  FIND_RESOURCES_TOOL,
  findResourcesArgsSchema,
  safetyNotices,
} from "@/lib/angel-ai"
import { lookupResources, type ResourceLookup } from "@/lib/resource-lookup"

// Conversations are relayed to Groq to generate a reply and are not stored or logged by NarcoGuard.
// Upstream directories and the AI provider can be slow; allow time for one fallback attempt.
export const maxDuration = 60

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
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

async function complete(apiKey: string, model: string, messages: ChatMessage[], withTools: boolean) {
  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.4,
      max_completion_tokens: 1024,
      ...(model.startsWith("openai/gpt-oss") ? { reasoning_effort: "low" } : {}),
      ...(withTools ? { tools: [FIND_RESOURCES_TOOL], tool_choice: "auto" } : {}),
    }),
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok) throw new Error(`provider ${response.status}`)
  const body = (await response.json()) as { choices?: { message?: ChatMessage }[] }
  const message = body.choices?.[0]?.message
  if (!message) throw new Error("provider empty")
  return message
}

export async function GET() {
  return NextResponse.json({ available: Boolean(process.env.GROQ_API_KEY), provider: "Groq" }, { headers: noStore })
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return NextResponse.json({ available: false, message: "Angel AI is not configured yet." }, { status: 503, headers: noStore })

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(forwarded)) return NextResponse.json({ error: "Too many messages. Wait a minute and try again." }, { status: 429, headers: noStore })

  const parsed = angelRequestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid message." }, { status: 400, headers: noStore })

  const latest = parsed.data.messages.at(-1)
  const notices = latest?.role === "user" ? safetyNotices(latest.content) : []
  const model = process.env.GROQ_MODEL || ANGEL_DEFAULT_MODEL
  const messages: ChatMessage[] = buildChatMessages(parsed.data)

  try {
    let reply = await complete(apiKey, model, messages, true)
    let resources: (ResourceLookup & { kind: string }) | undefined
    const call = reply.tool_calls?.find((c) => c.function?.name === "find_resources")
    if (call) {
      let args: unknown = null
      try { args = JSON.parse(call.function.arguments) } catch { /* invalid arguments are reported to the model below */ }
      const valid = findResourcesArgsSchema.safeParse(args)
      const result = valid.success ? { kind: valid.data.kind, ...(await lookupResources(valid.data.kind, { zip: valid.data.zip })) } : undefined
      resources = result
      messages.push({ role: "assistant", content: reply.content ?? null, tool_calls: [call] })
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result
          ? { status: result.status, results: result.results.map(({ name, address, phone, distanceMiles, source }) => ({ name, address, phone, distanceMiles, source })), fallback: result.fallback }
          : { error: "A valid kind and 5-digit ZIP code are required." }),
      })
      reply = await complete(apiKey, model, messages, false)
    }
    const text = reply.content?.trim() || "I couldn't put together a reply. Please try asking another way."
    return NextResponse.json({ available: true, notices, reply: text, resources }, { headers: noStore })
  } catch {
    console.warn("[angel] provider request failed")
    return NextResponse.json({ available: true, notices, error: "Angel couldn't respond right now. Try again, or use the search below." }, { status: 502, headers: noStore })
  }
}
