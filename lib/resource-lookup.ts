import { coarsen, fallbackLinks, findTreatmentUrl, overpassQuery, parseFindTreatment, parseOverpass, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"

const USER_AGENT = "NarcoGuard/2.0 (+https://www.narcoguard.app)"

export type ResourceOrigin = { lat: number; lon: number } | { zip: string }

export interface ResourceLookup {
  status: "ok" | "unavailable"
  message?: string
  fetchedAt?: string
  results: NearbyResource[]
  fallback: { title: string; url: string }[]
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init?.headers }, signal: AbortSignal.timeout(12_000), cache: "no-store" })
  if (!response.ok) throw new Error(`${new URL(url).hostname} responded ${response.status}`)
  return response.json()
}

async function geocodeZip(zip: string): Promise<{ lat: number; lon: number } | undefined> {
  const body = await fetchJson(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ postalcode: zip, countrycodes: "us", format: "json", limit: "1" })}`)
  const first = Array.isArray(body) ? (body[0] as { lat?: string; lon?: string } | undefined) : undefined
  const lat = Number(first?.lat), lon = Number(first?.lon)
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat: coarsen(lat), lon: coarsen(lon) } : undefined
}

/** Looks up live listings. Never logs the location; failures are reported by kind only. */
export async function lookupResources(kind: ResourceKind, origin: ResourceOrigin): Promise<ResourceLookup> {
  const fallback = fallbackLinks(kind, "zip" in origin ? origin.zip : undefined)
  try {
    let results: NearbyResource[]
    if (kind === "treatment") {
      const sAddr = "zip" in origin ? origin.zip : `${coarsen(origin.lat)},${coarsen(origin.lon)}`
      results = parseFindTreatment(await fetchJson(findTreatmentUrl(sAddr)))
    } else {
      const point = "zip" in origin ? await geocodeZip(origin.zip) : { lat: coarsen(origin.lat), lon: coarsen(origin.lon) }
      if (!point) return { status: "unavailable", message: "That ZIP code could not be located.", results: [], fallback }
      const body = await fetchJson("https://overpass-api.de/api/interpreter", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: overpassQuery(kind, point.lat, point.lon) }).toString(),
      })
      results = parseOverpass(kind, body, point)
    }
    return { status: "ok", fetchedAt: new Date().toISOString(), results, fallback }
  } catch (error) {
    // Only the upstream host and status are logged, never the location or query.
    const reason = error instanceof Error && /responded \d+$/.test(error.message) ? error.message : error instanceof Error ? error.name : "unknown"
    console.warn(`[resources] ${kind} lookup unavailable: ${reason}`)
    return { status: "unavailable", message: "The live directory did not respond. Use the links below.", results: [], fallback }
  }
}
