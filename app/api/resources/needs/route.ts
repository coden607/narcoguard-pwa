import { NextResponse } from "next/server"
import { z } from "zod"
import { lookupNeeds } from "@/lib/resource-lookup"
import { searchFreshZipResources } from "@/lib/resource-web-search"

// Two upstream directories are queried in parallel, with one Overpass fallback attempt.
export const maxDuration = 60

const querySchema = z.union([
  z.object({ lat: z.coerce.number().min(-90).max(90), lon: z.coerce.number().min(-180).max(180) }),
  z.object({ zip: z.string().regex(/^\d{5}$/) }),
])

// Location never goes in logs or cached responses.
const noStore = { "Cache-Control": "private, no-store" }

export async function GET(request: Request) {
  const parsed = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Provide a 5-digit ZIP or lat and lon." }, { status: 400, headers: noStore })
  // Low data mode asks the server to skip the extra fresh web search round trip.
  const skipFreshWeb = new URL(request.url).searchParams.get("web") === "0"
  const [result, web] = await Promise.all([
    lookupNeeds(parsed.data),
    "zip" in parsed.data && !skipFreshWeb ? searchFreshZipResources(parsed.data.zip) : Promise.resolve({ status: "skipped" as const, results: [] }),
  ])
  return NextResponse.json({ ...result, web }, { status: result.status === "unavailable" && web.status !== "ok" ? 502 : 200, headers: noStore })
}
