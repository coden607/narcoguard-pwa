"use client"

import { useEffect, useState } from "react"
import { LocateFixed } from "lucide-react"
import { Button } from "@/components/ui/button"
import { resourcesForNeed } from "@/lib/guardian-resources"
import type { Need } from "@/lib/guardian-stability"
import { kindsForNeeds, levelsForKinds } from "@/lib/maslow-needs"
import { fallbackLinks, SHORT_LABELS, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"

const NAMES: Record<Need, string> = {
  food: "Food", water: "Water", sleep: "Sleep", hygiene: "Shower / hygiene",
  laundry: "Laundry", safePlace: "Safe place", connection: "Connection", treatment: "Treatment support",
}

interface LookupBody {
  status?: string
  results?: NearbyResource[]
  fallback?: { title: string; url: string }[]
}

export function MatchedResources({ needs, postalCode }: { needs: Need[]; postalCode: string }) {
  const zip = /^\d{5}$/.test(postalCode) ? postalCode : ""
  const kinds = kindsForNeeds(needs)
  const levels = levelsForKinds(kinds)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [results, setResults] = useState<Partial<Record<ResourceKind, NearbyResource[]>>>({})
  const [originLabel, setOriginLabel] = useState(zip ? `ZIP ${zip}` : "")

  const search = async (origin: { zip: string } | { lat: number; lon: number }, label: string) => {
    setBusy(true)
    setNotice(undefined)
    setOriginLabel(label)
    const paramsFor = (kind: ResourceKind) => new URLSearchParams("zip" in origin ? { kind, zip: origin.zip } : { kind, lat: String(origin.lat), lon: String(origin.lon) })
    const next: Partial<Record<ResourceKind, NearbyResource[]>> = {}
    await Promise.all(kinds.map(async (kind) => {
      try {
        const response = await fetch(`/api/resources/nearby?${paramsFor(kind)}`, { cache: "no-store" })
        const body = (await response.json()) as LookupBody
        next[kind] = Array.isArray(body.results) ? body.results : []
      } catch {
        next[kind] = []
      }
    }))
    setResults(next)
    setBusy(false)
    if (Object.values(next).every((list) => !list?.length)) {
      setNotice("Live listings did not come back. Directory links below still work. Call before you go.")
    }
  }

  useEffect(() => {
    if (!zip || kinds.length === 0) return
    const timer = window.setTimeout(() => void search({ zip }, `ZIP ${zip}`), 400)
    return () => window.clearTimeout(timer)
    // Search again only when the unmet needs or ZIP change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zip, kinds.join(",")])

  if (needs.length === 0) return <p className="text-muted-foreground">Mark a need above and matching help is looked up here.</p>

  return (
    <div className="space-y-4" data-testid="matched-resources">
      <p className="text-sm text-muted-foreground">
        Marked needs are matched to Maslow levels and searched as you go. Listings come from public directories. Hours, openings and eligibility are not confirmed.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={busy} onClick={() => {
          if (!("geolocation" in navigator)) { setNotice("Location is not available. Enter a ZIP code instead."); return }
          setBusy(true)
          navigator.geolocation.getCurrentPosition(
            (position) => void search({ lat: position.coords.latitude, lon: position.coords.longitude }, "near you"),
            () => { setBusy(false); setNotice("Location permission was not given. Enter a ZIP code instead.") },
            { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
          )
        }}><LocateFixed className="mr-2 h-4 w-4" aria-hidden="true" />Search near me</Button>
        {originLabel && <span className="text-sm text-muted-foreground self-center">{busy ? "Searching…" : `Searched ${originLabel}`}</span>}
      </div>
      {notice && <p className="text-sm" role="status">{notice}</p>}
      {levels.map((level) => (
        <section key={level.id} className="space-y-2" aria-labelledby={`maslow-${level.id}`}>
          <h3 id={`maslow-${level.id}`} className="font-semibold">{level.title}</h3>
          {level.kinds.map((kind) => {
            const listings = results[kind] ?? []
            return (
              <div key={kind} className="border rounded-lg p-3 space-y-2" data-testid={`matched-${kind}`}>
                <p className="font-medium">{SHORT_LABELS[kind]}</p>
                {busy && listings.length === 0 && <p className="text-sm text-muted-foreground">Looking up live listings…</p>}
                {!busy && listings.length === 0 && <p className="text-sm">No live listings yet. That does not mean none exist.</p>}
                {listings.length > 0 && <ul className="space-y-2">{listings.slice(0, 5).map((resource) => (
                  <li key={`${resource.name}-${resource.lat}-${resource.lon}`} className="text-sm">
                    <span className="font-medium">{resource.name}</span>
                    {resource.distanceMiles !== undefined && <span className="text-muted-foreground"> · {resource.distanceMiles} mi</span>}
                    {resource.address && <span className="block text-muted-foreground">{resource.address}</span>}
                    <span className="flex flex-wrap gap-3">
                      {resource.phone && <a className="underline text-primary" href={`tel:${resource.phone.replace(/[^\d+]/g, "")}`}>Call</a>}
                      {resource.website && <a className="underline text-primary" href={resource.website} target="_blank" rel="noopener noreferrer">Website</a>}
                      {resource.lat !== undefined && resource.lon !== undefined && <a className="underline text-primary" href={`https://www.openstreetmap.org/?mlat=${resource.lat}&mlon=${resource.lon}#map=16/${resource.lat}/${resource.lon}`} target="_blank" rel="noopener noreferrer">Map</a>}
                    </span>
                  </li>
                ))}</ul>}
                <ul className="text-sm list-disc pl-5">
                  {fallbackLinks(kind).map((link) => <li key={link.url}><a className="underline text-primary" href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a></li>)}
                </ul>
              </div>
            )
          })}
        </section>
      ))}
      <div className="space-y-2">
        <h3 className="font-semibold">Starting points for what you marked</h3>
        {needs.map((need) => (
          <div key={need}>
            <p className="text-sm font-medium">{NAMES[need]}</p>
            {resourcesForNeed(need, zip).map((link) => <p key={link.url} className="text-sm"><a className="underline text-primary" href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a></p>)}
          </div>
        ))}
      </div>
      <p className="text-sm">In an emergency call <a className="underline text-primary" href="tel:911">911</a>. For a mental health or substance use crisis, call or text <a className="underline text-primary" href="tel:988">988</a>.</p>
    </div>
  )
}
