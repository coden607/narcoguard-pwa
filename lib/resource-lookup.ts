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

// Public Overpass instances; the second is tried when the first times out or is rate-limited.
const OVERPASS_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]

async function fetchJson(url: string, init?: RequestInit, timeoutMs = 12_000): Promise<unknown> {
  const response = await fetch(url, { ...init, headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...init?.headers }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" })
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
  const fallback = fallbackLinks(kind)
  try {
    const point = "zip" in origin ? await geocodeZip(origin.zip) : { lat: coarsen(origin.lat), lon: coarsen(origin.lon) }
    if (!point) return { status: "unavailable", message: "That ZIP code could not be located.", results: [], fallback }
    let results: NearbyResource[]
    if (kind === "treatment") {
      results = parseFindTreatment(await fetchJson(findTreatmentUrl(point.lat, point.lon)))
    } else {
      const body = new URLSearchParams({ data: overpassQuery(kind, point.lat, point.lon) }).toString()
      let data: unknown
      for (const [index, endpoint] of OVERPASS_ENDPOINTS.entries()) {
        try {
          data = await fetchJson(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }, 22_000)
          break
        } catch (error) {
          if (index === OVERPASS_ENDPOINTS.length - 1) throw error
        }
      }
      results = parseOverpass(kind, data, point)
    }
    return { status: "ok", fetchedAt: new Date().toISOString(), results, fallback }
  } catch (error) {
    // Only the upstream host and status are logged, never the location or query.
    const reason = error instanceof Error && /responded \d+$/.test(error.message) ? error.message : error instanceof Error ? error.name : "unknown"
    console.warn(`[resources] ${kind} lookup unavailable: ${reason}`)
    return { status: "unavailable", message: "The live directory did not respond. Use the links below.", results: [], fallback }
  }
}
