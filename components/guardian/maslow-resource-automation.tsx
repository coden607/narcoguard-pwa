"use client"

import { useEffect, useMemo, useState } from "react"
import type { Need } from "@/lib/guardian-stability"
import { normalizePostalCode } from "@/lib/guardian-resources"
import { MASLOW_LEVELS, resourceKindsForNeeds } from "@/lib/maslow-resources"
import { RESOURCE_LABELS, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"

type KindLookup = {
  status: "ok" | "unavailable"
  results: NearbyResource[]
  fallback: { title: string; url: string }[]
}

type NeedsLookup = {
  status: "ok" | "partial" | "unavailable"
  message?: string
  fetchedAt?: string
  kinds: Record<ResourceKind, KindLookup>
}

export function MaslowResourceAutomation({ needs, postalCode }: { needs: readonly Need[]; postalCode: string }) {
  const zip = normalizePostalCode(postalCode)
  const kinds = useMemo(() => resourceKindsForNeeds(needs), [needs])
  const [data, setData] = useState<NeedsLookup | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const key = zip + "|" + kinds.join(",")

  useEffect(() => {
    if (!zip || kinds.length === 0) {
      setData(null)
      setError("")
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError("")
    fetch("/api/resources/needs?zip=" + encodeURIComponent(zip), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as NeedsLookup | { error?: string }
        if (!response.ok && !("kinds" in body)) throw new Error(body.error || "Resource lookup is unavailable.")
        return body as NeedsLookup
      })
      .then((body) => setData(body))
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : "Resource lookup is unavailable.")
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [key, kinds, zip])

  if (needs.length === 0) return null

  if (!zip) return (
    <div className="rounded-lg border p-4">
      <p className="font-medium">Nearby help can be matched automatically.</p>
      <p className="text-sm text-muted-foreground">Enter a five-digit ZIP above. NarcoGuard uses it only for this live lookup and still shows directory fallbacks if a provider does not respond.</p>
    </div>
  )

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-lg border p-4">
        <p className="font-medium">Automatic Maslow-based resource match</p>
        <p className="text-sm text-muted-foreground">Based only on needs you marked or voluntary signals you recorded. Lower-level needs are shown first for convenience, but you may use any resource in any order.</p>
        {loading && <p className="text-sm mt-2">Checking nearby public directories…</p>}
        {error && <p className="text-sm mt-2">Live lookup failed: {error} Directory links remain available below.</p>}
        {data?.message && <p className="text-sm mt-2">{data.message}</p>}
      </div>

      {data && MASLOW_LEVELS.map((level) => {
        const levelKinds = level.kinds.filter((kind) => kinds.includes(kind))
        if (levelKinds.length === 0) return null
        return (
          <section key={level.id} className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-semibold">{level.title}</h3>
              <p className="text-sm text-muted-foreground">{level.description}</p>
            </div>
            {levelKinds.map((kind) => {
              const lookup = data.kinds[kind]
              return (
                <div key={kind} className="space-y-2">
                  <h4 className="font-medium">{RESOURCE_LABELS[kind]}</h4>
                  {lookup.results.length > 0 ? (
                    <ul className="space-y-2">
                      {lookup.results.slice(0, 3).map((resource) => (
                        <li key={kind + "|" + resource.name + "|" + (resource.address ?? resource.distanceMiles ?? "")} className="rounded border p-3">
                          <strong>{resource.name}</strong>
                          {resource.distanceMiles !== undefined && <span className="text-sm"> · {resource.distanceMiles} mi</span>}
                          {resource.address && <span className="block text-sm">{resource.address}</span>}
                          {resource.hours && <span className="block text-sm">Listed hours: {resource.hours}</span>}
                          <span className="block text-xs text-muted-foreground">Source: {resource.source}. Call first to confirm current availability, eligibility and hours.</span>
                          <span className="block text-sm space-x-3 mt-1">
                            {resource.phone && <a className="underline text-primary" href={"tel:" + resource.phone.replace(/[^\\d+]/g, "")}>Call</a>}
                            {resource.website && <a className="underline text-primary" href={resource.website} target="_blank" rel="noopener noreferrer">Website ↗</a>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No nearby listing was returned for this category. This does not mean no service exists.</p>
                  )}
                  <div className="text-sm">
                    {lookup.fallback.map((fallback) => (
                      <a key={fallback.url} className="underline text-primary mr-3" href={fallback.url} target="_blank" rel="noopener noreferrer">{fallback.title} ↗</a>
                    ))}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}
    </div>
  )
}