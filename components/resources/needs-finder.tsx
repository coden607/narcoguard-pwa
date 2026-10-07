"use client"

import { useEffect, useState } from "react"
import { LocateFixed, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { safetyNotices } from "@/lib/angel-ai"
import { QUICK_NEEDS, matchNeeds, orderByMaslow } from "@/lib/need-intent"
import { NEED_LEVELS, RESOURCE_LABELS, SHORT_LABELS, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"

interface KindLookup {
  status: "ok" | "unavailable"
  results: NearbyResource[]
  fallback: { title: string; url: string }[]
  widenedMiles?: number
}

interface NeedsResponse {
  status: "ok" | "partial" | "unavailable"
  message?: string
  fetchedAt?: string
  kinds: Partial<Record<ResourceKind, KindLookup>>
}

type Origin = { lat: number; lon: number } | { zip: string }

const DIRECTORY_211 = { title: "Find local help through 211", url: "https://www.211.org/get-help" }

function ResourceCard({ resource }: { resource: NearbyResource }) {
  return (
    <li className="border rounded-lg p-3 space-y-1">
      <p className="font-semibold">{resource.name}{resource.distanceMiles !== undefined && <span className="font-normal text-muted-foreground"> · {resource.distanceMiles} mi</span>}</p>
      {resource.address && <p className="text-sm text-muted-foreground">{resource.address}</p>}
      {resource.hours && <p className="text-sm text-muted-foreground">Listed hours: {resource.hours} (may be out of date)</p>}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {resource.phone && <a className="underline text-primary inline-flex min-h-6 items-center" href={`tel:${resource.phone.replace(/[^\d+]/g, "")}`}>Call {resource.phone}</a>}
        {resource.website && <a className="underline text-primary inline-flex min-h-6 items-center" href={resource.website} target="_blank" rel="noopener noreferrer">Website</a>}
        {resource.lat !== undefined && resource.lon !== undefined && (
          <a className="underline text-primary inline-flex min-h-6 items-center" href={`https://www.openstreetmap.org/?mlat=${resource.lat}&mlon=${resource.lon}#map=17/${resource.lat}/${resource.lon}`} target="_blank" rel="noopener noreferrer">Map</a>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Source: {resource.source}. Hours, openings and eligibility are not confirmed; call first.</p>
    </li>
  )
}

function KindResults({ kind, lookup, open = false }: { kind: ResourceKind; lookup: KindLookup | undefined; open?: boolean }) {
  const results = lookup?.results ?? []
  const fallback = lookup?.fallback.length ? lookup.fallback : [DIRECTORY_211]
  const where = lookup?.widenedMiles ? `within ${lookup.widenedMiles} mi` : "nearby"
  const summary = lookup?.status !== "ok" ? "directory links" : results.length === 0 ? "none listed nearby" : `${results.length} ${where} · closest ${results[0].distanceMiles ?? "?"} mi`
  return (
    <details className="border rounded-lg" data-testid={`need-${kind}`} open={open || undefined}>
      <summary className="cursor-pointer p-3 min-h-11 flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{SHORT_LABELS[kind]}</span>
        <span className="text-sm text-muted-foreground">{summary}</span>
      </summary>
      <div className="px-3 pb-3 space-y-3">
        {RESOURCE_LABELS[kind] !== SHORT_LABELS[kind] && <p className="text-sm">{RESOURCE_LABELS[kind]}</p>}
        {lookup?.status !== "ok" && <p className="text-sm">Live listings are unavailable right now.</p>}
        {lookup?.status === "ok" && results.length === 0 && <p className="text-sm">No listings found nearby in public data. That does not mean there are none; try the directories below.</p>}
        {lookup?.widenedMiles && results.length > 0 && <p className="text-sm">Nothing was listed within 10 miles, so this searched up to {lookup.widenedMiles} miles. Call first; a closer service may not be in public data.</p>}
        {results.length > 0 && <ul className="space-y-2">{results.map((resource) => <ResourceCard key={`${resource.name}-${resource.lat}-${resource.lon}`} resource={resource} />)}</ul>}
        <ul className="text-sm list-disc pl-5 space-y-1" aria-label={`Other directories for ${SHORT_LABELS[kind]}`}>
          {fallback.map((link) => <li key={link.url}><a className="inline-flex min-h-6 items-center underline text-primary" href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a></li>)}
        </ul>
      </div>
    </details>
  )
}

type Ai = { available: boolean; provider: string | null }

export function NeedsFinder() {
  const [needText, setNeedText] = useState("")
  const [picked, setPicked] = useState<ResourceKind[]>([])
  const [aiKinds, setAiKinds] = useState<ResourceKind[]>([])
  const [ai, setAi] = useState<Ai>({ available: false, provider: null })
  const [aiNote, setAiNote] = useState<string>()
  const [aiBusy, setAiBusy] = useState(false)
  const [zip, setZip] = useState("")
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string>()
  const [data, setData] = useState<NeedsResponse>()

  useEffect(() => {
    let cancelled = false
    fetch("/api/resources/understand", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Ai) => { if (!cancelled) setAi({ available: Boolean(body.available), provider: body.provider ?? null }) })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  // What the person said they need, put in Maslow order. Typed words are matched on this device.
  const stated = orderByMaslow([...picked, ...matchNeeds(needText), ...aiKinds])
  const notices = safetyNotices(needText)
  const togglePick = (kinds: ResourceKind[]) => setPicked((current) => kinds.every((kind) => current.includes(kind)) ? current.filter((kind) => !kinds.includes(kind)) : [...current, ...kinds])

  const understandWithAi = async () => {
    setAiBusy(true)
    setAiNote(undefined)
    try {
      const response = await fetch("/api/resources/understand", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: needText }) })
      const body = (await response.json()) as { kinds?: ResourceKind[]; error?: string }
      if (!response.ok || !body.kinds) setAiNote(body.error ?? "AI matching did not work. Pick your needs below instead.")
      else if (body.kinds.length === 0) setAiNote("The AI did not find a matching kind of service. Pick from the list below or search everything.")
      else { setAiKinds(orderByMaslow(body.kinds)); setAiNote(undefined) }
    } catch {
      setAiNote("Could not reach NarcoGuard. Pick your needs below instead.")
    } finally {
      setAiBusy(false)
    }
  }

  const lookup = async (origin: Origin) => {
    setBusy(true)
    setNotice(undefined)
    try {
      const params = new URLSearchParams("zip" in origin ? { zip: origin.zip } : { lat: String(origin.lat), lon: String(origin.lon) })
      const response = await fetch(`/api/resources/needs?${params}`, { cache: "no-store" })
      const body = (await response.json()) as NeedsResponse
      setData(body.kinds ? body : { status: "unavailable", kinds: {} })
    } catch {
      setData({ status: "unavailable", message: "Could not reach the directories. Check your connection.", kinds: {} })
    } finally {
      setBusy(false)
    }
  }

  const findNearMe = () => {
    if (!("geolocation" in navigator)) {
      setNotice("Location is not available in this browser. Enter a ZIP code instead.")
      return
    }
    setBusy(true)
    setNotice(undefined)
    navigator.geolocation.getCurrentPosition(
      (position) => void lookup({ lat: position.coords.latitude, lon: position.coords.longitude }),
      () => {
        setBusy(false)
        setNotice("Location permission was not given. Enter a ZIP code instead.")
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    )
  }

  return (
    <section className="space-y-4" aria-labelledby="needs-heading" data-testid="needs-finder">
      <div className="space-y-1">
        <h2 id="needs-heading" className="text-xl font-semibold">Find help near me</h2>
        <p className="text-sm text-muted-foreground">
          One search covers every level of need, from food, water and shelter to health care, recovery, libraries and job help. Start wherever you need to.
        </p>
      </div>
      <div className="space-y-2 rounded-lg border p-3" data-testid="need-input">
        <label htmlFor="need-text" className="font-medium">What do you need right now? <span className="font-normal text-muted-foreground">(optional)</span></label>
        <textarea id="need-text" rows={2} maxLength={500} className="w-full bg-background border rounded p-2" placeholder="For example: I'm hungry and need somewhere to sleep tonight" value={needText} onChange={(event) => { setNeedText(event.target.value); setAiKinds([]) }} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Or tap what you need">
          {QUICK_NEEDS.map((need) => {
            const on = need.kinds.every((kind) => picked.includes(kind))
            return <Button key={need.label} type="button" size="sm" variant={on ? "default" : "outline"} aria-pressed={on} onClick={() => togglePick(need.kinds)}>{need.label}</Button>
          })}
        </div>
        {notices.map((notice) => <p key={notice} className="rounded border border-destructive bg-destructive/10 p-2 text-sm font-semibold" role="alert">{notice}</p>)}
        {stated.length > 0 ? (
          <p className="text-sm" data-testid="stated-needs">Shown first, basic needs at the top: {stated.map((kind) => SHORT_LABELS[kind]).join(" · ")}</p>
        ) : needText.trim() ? (
          <p className="text-sm text-muted-foreground">No need recognized from those words yet. Tap one above, or search and see everything.</p>
        ) : null}
        {ai.available && needText.trim() && (
          <div className="space-y-1">
            <Button type="button" size="sm" variant="ghost" onClick={understandWithAi} disabled={aiBusy}><Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />{aiBusy ? "Reading…" : "Let AI read my words"}</Button>
            <p className="text-xs text-muted-foreground">Only if you tap: your words are sent to {ai.provider === "OpenRouter" ? "OpenRouter (no-retention providers only)" : ai.provider ?? "an AI provider"} for this one match, and are not saved. Matching on this device already works without it.</p>
          </div>
        )}
        {aiNote && <p className="text-sm" role="status">{aiNote}</p>}
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="button" onClick={findNearMe} disabled={busy}><LocateFixed className="mr-2 h-4 w-4" aria-hidden="true" />Find everything near me</Button>
        <form
          className="flex gap-2 flex-1"
          onSubmit={(event) => {
            event.preventDefault()
            if (!/^\d{5}$/.test(zip)) {
              setNotice("Enter a five-digit US ZIP code.")
              return
            }
            void lookup({ zip })
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
      {busy && <p className="text-sm text-muted-foreground" role="status">Searching every need…</p>}
      {data && !busy && (
        <div className="space-y-5" aria-live="polite">
          {data.message && <p className="text-sm">{data.message}</p>}
          {stated.length > 0 && (
            <section className="space-y-2 rounded-lg border-2 border-primary/60 p-3" aria-labelledby="level-yours" data-testid="your-needs">
              <h3 id="level-yours" className="font-semibold">Your needs first</h3>
              <div className="space-y-2">
                {stated.map((kind) => <KindResults key={kind} kind={kind} lookup={data.kinds[kind]} open />)}
              </div>
            </section>
          )}
          {NEED_LEVELS.map((level) => {
            const rest = (level.kinds as readonly ResourceKind[]).filter((kind) => !stated.includes(kind))
            if (rest.length === 0) return null
            return (
              <section key={level.id} className="space-y-2" aria-labelledby={`level-${level.id}`}>
                <h3 id={`level-${level.id}`} className="font-semibold">{level.title}</h3>
                <div className="space-y-2">
                  {rest.map((kind) => <KindResults key={kind} kind={kind} lookup={data.kinds[kind]} />)}
                </div>
              </section>
            )
          })}
          {data.fetchedAt && <p className="text-xs text-muted-foreground">Searched at {new Date(data.fetchedAt).toLocaleTimeString()}. Listings come from public directories and may be incomplete.</p>}
        </div>
      )}
      <p className="text-sm">In an emergency call <a className="underline text-primary" href="tel:911">911</a>. For a mental health or substance use crisis, call or text <a className="underline text-primary" href="tel:988">988</a>.</p>
    </section>
  )
}
