"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { RESOURCE_KINDS, RESOURCE_LABELS, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"

interface LookupResponse {
  status: "ok" | "unavailable"
  message?: string
  fetchedAt?: string
  results: NearbyResource[]
  fallback: { title: string; url: string }[]
}

type Origin = { lat: number; lon: number } | { zip: string }

const SHORT_LABELS: Record<ResourceKind, string> = { treatment: "Treatment", food: "Food", shelter: "Shelter", pharmacy: "Pharmacy" }

export function NearbyResources({ initialKind = "treatment" }: { initialKind?: ResourceKind }) {
  const [kind, setKind] = useState<ResourceKind>(initialKind)
  const [zip, setZip] = useState("")
  const [origin, setOrigin] = useState<Origin>()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [data, setData] = useState<LookupResponse>()

  const lookup = async (nextKind: ResourceKind, nextOrigin: Origin) => {
    setBusy(true)
    setNotice(undefined)
    try {
      const params = new URLSearchParams({ kind: nextKind, ...("zip" in nextOrigin ? { zip: nextOrigin.zip } : { lat: String(nextOrigin.lat), lon: String(nextOrigin.lon) }) })
      const response = await fetch(`/api/resources/nearby?${params}`, { cache: "no-store" })
      const body = (await response.json()) as LookupResponse
      setData(body.results ? body : { status: "unavailable", results: [], fallback: [] })
    } catch {
      setData({ status: "unavailable", message: "Could not reach the directory. Check your connection.", results: [], fallback: [{ title: "Find local help through 211", url: "https://www.211.org/get-help" }] })
    } finally {
      setBusy(false)
    }
  }

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setNotice("Location is not available in this browser. Enter a ZIP code instead.")
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lon: position.coords.longitude }
        setOrigin(next)
        void lookup(kind, next)
      },
      () => {
        setBusy(false)
        setNotice("Location permission was not given. Enter a ZIP code instead.")
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    )
  }

  const chooseKind = (next: ResourceKind) => {
    setKind(next)
    if (origin) void lookup(next, origin)
  }

  return (
    <section className="space-y-4" aria-labelledby="nearby-heading" data-testid="nearby-resources">
      <h2 id="nearby-heading" className="text-xl font-semibold">Find help near me</h2>
      <div className="flex flex-wrap gap-2" role="group" aria-label="What do you need?">
        {RESOURCE_KINDS.map((option) => (
          <Button key={option} type="button" variant={option === kind ? "default" : "outline"} aria-pressed={option === kind} onClick={() => chooseKind(option)}>
            {SHORT_LABELS[option]}
          </Button>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="button" onClick={useMyLocation} disabled={busy}>Use my location</Button>
        <form
          className="flex gap-2 flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            if (!/^\d{5}$/.test(zip)) {
              setNotice("Enter a five-digit US ZIP code.")
              return
            }
            const next = { zip }
            setOrigin(next)
            void lookup(kind, next)
          }}
        >
          <input aria-label="ZIP code" inputMode="numeric" maxLength={5} className="bg-background border rounded p-2 w-28" placeholder="ZIP code" value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, ""))} />
          <Button type="submit" variant="outline" disabled={busy}>Search</Button>
        </form>
      </div>
      <p className="text-xs text-muted-foreground">
        Your location is used only for this search, rounded to about a kilometer, and is not saved.
      </p>
      {notice && <p className="text-sm" role="status">{notice}</p>}
      {busy && <p className="text-sm text-muted-foreground" role="status">Searching…</p>}
      {data && !busy && (
        <div className="space-y-3" aria-live="polite">
          <p className="text-sm font-medium">{RESOURCE_LABELS[kind]}</p>
          {data.status === "ok" && data.results.length === 0 && <p className="text-sm">No listings found within about 10 miles.</p>}
          {data.status === "unavailable" && <p className="text-sm">{data.message ?? "Live listings are unavailable right now."}</p>}
          {data.results.length > 0 && (
            <ul className="space-y-2">
              {data.results.map((resource) => (
                <li key={`${resource.name}-${resource.lat}-${resource.lon}`} className="border rounded-lg p-3 space-y-1">
                  <p className="font-semibold">{resource.name}{resource.distanceMiles !== undefined && <span className="font-normal text-muted-foreground"> · {resource.distanceMiles} mi</span>}</p>
                  {resource.address && <p className="text-sm text-muted-foreground">{resource.address}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {resource.phone && <a className="underline text-primary inline-flex min-h-6 items-center" href={`tel:${resource.phone.replace(/[^\d+]/g, "")}`}>Call {resource.phone}</a>}
                    {resource.website && <a className="underline text-primary inline-flex min-h-6 items-center" href={resource.website} target="_blank" rel="noopener noreferrer">Website</a>}
                    {resource.lat !== undefined && resource.lon !== undefined && (
                      <a className="underline text-primary inline-flex min-h-6 items-center" href={`https://www.openstreetmap.org/?mlat=${resource.lat}&mlon=${resource.lon}#map=17/${resource.lat}/${resource.lon}`} target="_blank" rel="noopener noreferrer">Map</a>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Source: {resource.source}. Hours, openings and eligibility are not confirmed; call first.</p>
                </li>
              ))}
            </ul>
          )}
          {data.fallback.length > 0 && (
            <div className="text-sm space-y-1">
              <p className="font-medium">Other directories</p>
              <ul className="list-disc pl-5 space-y-1">
                {data.fallback.map((link) => (
                  <li key={link.url}><a className="inline-flex min-h-6 items-center underline text-primary" href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      <p className="text-sm">In an emergency call <a className="underline text-primary" href="tel:911">911</a>. For a mental health or substance use crisis, call or text <a className="underline text-primary" href="tel:988">988</a>.</p>
    </section>
  )
}
