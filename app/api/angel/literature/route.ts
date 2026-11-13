import { NextResponse } from "next/server"
import { safeResearchTerms, searchLifeCompassResearch } from "@/packages/life-compass-core/src/research"

const headers = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" }
const hits = new Map<string, number[]>()
function tooMany(key: string, now = Date.now()) {
  const recent = (hits.get(key) || []).filter(ts => now - ts < 60_000)
  if (recent.length >= 8) return true
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 1000) hits.clear()
  return false
}
// Explicit generic-keyword lookup only. No Angel messages, journal records,
// full location, client token, user identifier, or personal health details are forwarded.
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") || ""
  if (!safeResearchTerms(query)) return NextResponse.json({ error: "Enter 3–140 characters of general research terms." }, { status: 400, headers })
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (tooMany(ip)) return NextResponse.json({ error: "Too many research requests." }, { status: 429, headers })
  try {
    const result = await searchLifeCompassResearch(query, { signal: AbortSignal.timeout(8_000) })
    return NextResponse.json(result, { headers })
  } catch {
    return NextResponse.json({ error: "PubMed unavailable; no citations verified." }, { status: 502, headers })
  }
}
