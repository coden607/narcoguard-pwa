"use client"

import { useEffect, useMemo, useState } from "react"
import type { Need } from "@/lib/guardian-stability"
import { normalizePostalCode } from "@/lib/guardian-resources"
import { MASLOW_LEVELS, resourceKindsForNeeds } from "@/lib/maslow-resources"
import { RESOURCE_LABELS, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"
import { cardSummary } from "@/lib/resource-display"
import { inventoryFreshness, knownResourcesFor, readKnownResources, rememberKnownResources, type KnownResource } from "@/lib/resource-inventory"
import { detectResourceChanges, readResourceChangeWatches, setResourceChangeWatch, type ResourceChange } from "@/lib/resource-change-watch"
import { activeResourceVerification, readResourceVerifications, saveResourceVerification, verificationLabel, type ResourceVerification, type ResourceVerificationMethod, type ResourceVerificationStatus } from "@/lib/resource-verification"
import {
  defaultResourcePreferences,
  explainResource,
  rankResources,
  readResourceFeedback,
  readResourcePreferences,
  resourceKey,
  saveResourceFeedback,
  saveResourcePreferences,
  type ResourceFeedback,
  type ResourceFeedbackValue,
  type ResourcePreferences,
} from "@/lib/resource-personalization"

const CHIP_TONE_CLASS: Record<string, string> = {
  open: "text-green-400",
  closed: "text-red-400",
  unknown: "text-muted-foreground",
}

type KindLookup = {
  status: "ok" | "unavailable"
  results: NearbyResource[]
  fallback: { title: string; url: string }[]
}

const ALL_RESOURCE_KINDS = [...new Set(MASLOW_LEVELS.flatMap((level) => level.kinds as readonly ResourceKind[]))]

type NeedsLookup = {
  status: "ok" | "partial" | "unavailable"
  message?: string
  fetchedAt?: string
  kinds: Record<ResourceKind, KindLookup>
}

export function MaslowResourceAutomation({ needs, postalCode }: { needs: readonly Need[]; postalCode: string }) {
  const zip = normalizePostalCode(postalCode)
  const kinds = resourceKindsForNeeds(needs)
  const [request, setRequest] = useState<{ zip: string; data?: NeedsLookup; error?: string }>({ zip: "" })
  const [preferences, setPreferences] = useState<ResourcePreferences>(defaultResourcePreferences())
  const [feedback, setFeedback] = useState<ResourceFeedback[]>([])
  const [inventory, setInventory] = useState<KnownResource[]>([])
  const [refreshTick, setRefreshTick] = useState(0)
  const [watchedKeys, setWatchedKeys] = useState<string[]>([])
  const [resourceChanges, setResourceChanges] = useState<ResourceChange[]>([])
  const [verifications, setVerifications] = useState<ResourceVerification[]>([])
  const [verificationMethods, setVerificationMethods] = useState<Record<string, ResourceVerificationMethod>>({})
  const [verificationNotes, setVerificationNotes] = useState<Record<string, string>>({})
  const data = request.zip === zip ? request.data ?? null : null
  const error = request.zip === zip ? request.error ?? "" : ""
  const loading = Boolean(zip) && request.zip !== zip
  const allKinds = [...new Set(MASLOW_LEVELS.flatMap((level) => level.kinds as readonly ResourceKind[]))]
  const otherKinds = allKinds.filter((kind) => !kinds.includes(kind))
  const knownForCurrentNeeds = knownResourcesFor(inventory, zip, kinds)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferences(readResourcePreferences(window.localStorage))
      setFeedback(readResourceFeedback(window.localStorage))
      setInventory(readKnownResources(window.localStorage))
      setWatchedKeys(readResourceChangeWatches(window.localStorage))
      setVerifications(readResourceVerifications(window.localStorage))
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!zip) return
    const controller = new AbortController()
    fetch("/api/resources/needs?zip=" + encodeURIComponent(zip), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as NeedsLookup | { error?: string }
        if (!response.ok && !("kinds" in body)) throw new Error(body.error || "Resource lookup is unavailable.")
        return body as NeedsLookup
      })
      .then((body) => {
        if (controller.signal.aborted) return
        setRequest({ zip, data: body })
        const seen = Object.values(body.kinds).flatMap((lookup) => lookup.results)
        const fetchedAt = body.fetchedAt || new Date().toISOString()
        const previous = readKnownResources(window.localStorage)
        const watched = readResourceChangeWatches(window.localStorage)
        const changes = detectResourceChanges({ previous, latest: seen, watchedKeys: watched, zip, fetchedAt })
        setResourceChanges(changes)
        setInventory(rememberKnownResources(window.localStorage, zip, seen, fetchedAt))
        if (changes.length > 0 && "Notification" in window && Notification.permission === "granted" && "serviceWorker" in navigator) {
          void navigator.serviceWorker.ready.then((registration) => registration.showNotification("NarcoGuard resource update", {
            body: "A resource you chose to watch changed in public-directory data. Open NarcoGuard to review.",
            tag: "narcoguard-resource-change",
            data: { url: "/stability" },
          })).catch(() => undefined)
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setRequest({ zip, error: cause instanceof Error ? cause.message : "Resource lookup is unavailable." })
      })
    return () => controller.abort()
  }, [zip, refreshTick])

  useEffect(() => {
    if (!zip) return
    const timer = window.setInterval(() => setRefreshTick((value) => value + 1), 15 * 60_000)
    return () => window.clearInterval(timer)
  }, [zip])

  const ranked = useMemo(() => {
    if (!data) return null
    const next = {} as Record<ResourceKind, KindLookup>
    for (const kind of ALL_RESOURCE_KINDS) {
      const lookup = data.kinds[kind]
      next[kind] = lookup ? { ...lookup, results: rankResources(lookup.results, preferences, feedback) } : { status: "unavailable", results: [], fallback: [] }
    }
    return next
  }, [data, preferences, feedback])

  const updatePreferences = (next: ResourcePreferences) => {
    saveResourcePreferences(window.localStorage, next)
    setPreferences(next)
  }
  const recordFeedback = (resource: NearbyResource, value: ResourceFeedbackValue) => {
    const row = { key: resourceKey(resource), value, updatedAt: new Date().toISOString() }
    saveResourceFeedback(window.localStorage, row)
    setFeedback(readResourceFeedback(window.localStorage))
  }

  const toggleResourceWatch = (resource: NearbyResource) => {
    const key = resourceKey(resource)
    const enabled = !watchedKeys.includes(key)
    setWatchedKeys(setResourceChangeWatch(window.localStorage, key, enabled))
  }

  const recordVerification = (resource: NearbyResource, status: ResourceVerificationStatus) => {
    const key = resourceKey(resource)
    const defaultMethod: ResourceVerificationMethod = resource.phone ? "phone" : resource.website ? "website" : "other"
    const method = verificationMethods[key] ?? defaultMethod
    const note = verificationNotes[key] ?? ""
    setVerifications(saveResourceVerification(window.localStorage, resource, status, method, note))
  }

  if (needs.length === 0) return null

  if (!zip) return (
    <div className="rounded-lg border p-4">
      <p className="font-medium">Nearby help can be matched automatically.</p>
      <p className="text-sm text-muted-foreground">Enter a five-digit ZIP above. NarcoGuard uses it only for this live lookup and still shows directory fallbacks if a provider does not respond.</p>
    </div>
  )

  return (
    <div className="space-y-4" aria-live="polite">
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <p className="font-medium">Automatic Maslow-based resource match</p>
          <p className="text-sm text-muted-foreground">Based only on needs you marked or voluntary signals you recorded. Lower-level needs are shown first for convenience, but you may use any resource in any order.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Maximum distance, if you want one
            <input
              aria-label="Maximum resource distance"
              inputMode="decimal"
              className="block w-full border rounded p-2 bg-background"
              placeholder="No limit"
              value={preferences.maxDistanceMiles ?? ""}
              onChange={(e) => {
                const raw=e.target.value.trim()
                const value=raw ? Number(raw) : null
                updatePreferences({ ...preferences, maxDistanceMiles: value !== null && Number.isFinite(value) && value > 0 ? Math.min(value, 100) : null })
              }}
            />
          </label>
          <label className="flex gap-2 items-center text-sm mt-6">
            <input type="checkbox" checked={preferences.preferFreeFood} onChange={(e)=>updatePreferences({ ...preferences, preferFreeFood:e.target.checked })} />
            Prefer free/community food before paid quick-meal options
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Preferences and “worked / closed / too far / not for me” feedback stay in this browser and only affect your ranking.</p>
        <div className="flex flex-wrap gap-2 items-center">
          {loading && <p className="text-sm">Checking nearby public directories…</p>}
          <button type="button" className="text-sm underline text-primary" onClick={() => setRefreshTick((value) => value + 1)} disabled={loading}>Refresh known availability</button>
        </div>
        {error && <p className="text-sm">Live lookup failed: {error} Previously known resources remain available below with freshness labels; directory links remain available too.</p>}
        {data?.message && <p className="text-sm">{data.message}</p>}
        {resourceChanges.length > 0 && <div className="rounded border border-primary/30 p-3" role="status" data-testid="resource-change-alerts">
          <p className="font-medium">Watched resource updates</p>
          <ul className="mt-2 space-y-1 text-sm">{resourceChanges.map((change, index) => <li key={change.key + "-" + change.type + "-" + index}>{change.message}</li>)}</ul>
          <p className="mt-2 text-xs text-muted-foreground">These alerts describe changes in public-directory results, not confirmed provider availability. Call or check the provider before relying on the listing.</p>
        </div>}
        {knownForCurrentNeeds.length > 0 && <div className="rounded border p-3">
          <p className="font-medium">Known resource inventory</p>
          <p className="text-xs text-muted-foreground">NarcoGuard remembers resources previously returned for this ZIP in this browser and rechecks public sources every 15 minutes while this screen is open. “Open now” comes only from parseable listed hours; anything else stays unknown.</p>
          <ul className="mt-2 space-y-1 text-sm">
            {knownForCurrentNeeds.slice(0, 8).map((row) => {
              const summary = cardSummary(row.resource, new Date())
              const freshness = inventoryFreshness(row.lastSeenAt)
              return <li key={"known-" + row.key}>
                <strong>{row.resource.name}</strong> · {RESOURCE_LABELS[row.resource.kind]} · {summary.chip.label}
                <span className="text-muted-foreground"> · last seen {new Date(row.lastSeenAt).toLocaleString()} · {freshness === "fresh" ? "fresh lookup" : freshness === "aging" ? "aging lookup" : "stale — refresh recommended"}</span>
              </li>
            })}
          </ul>
        </div>}
      </div>

      {ranked && MASLOW_LEVELS.map((level) => {
        let levelKinds = (level.kinds as readonly ResourceKind[]).filter((kind) => kinds.includes(kind))
        if (preferences.preferFreeFood) levelKinds = [...levelKinds].sort((a,b)=>a==="food"?-1:b==="food"?1:a==="quick-meal"?1:b==="quick-meal"?-1:0)
        if (levelKinds.length === 0) return null
        return (
          <section key={level.id} className="rounded-lg border p-4 space-y-3">
            <div>
              <h3 className="font-semibold">{level.title}</h3>
              <p className="text-sm text-muted-foreground">{level.description}</p>
            </div>
            {levelKinds.map((kind) => {
              const lookup = ranked[kind]
              return (
                <div key={kind} className="space-y-2">
                  <h4 className="font-medium">{RESOURCE_LABELS[kind]}</h4>
                  {lookup.results.length > 0 ? (
                    <ul className="space-y-2">
                      {lookup.results.slice(0, 3).map((resource, optionIndex) => {
                        const summary = cardSummary(resource, new Date())
                        const detail = [summary.hours, summary.freshness, summary.wheelchair, summary.services].filter((line): line is string => line !== null).join(" · ")
                        const key = resourceKey(resource)
                        const verification = activeResourceVerification(verifications, resource)
                        const verificationMethod = verificationMethods[key] ?? (resource.phone ? "phone" : resource.website ? "website" : "other")
                        return (
                        <li key={resourceKey(resource)} className="rounded border p-3">
                          <strong>{["Option A", "Option B", "Option C"][optionIndex] ?? "Option"}: {resource.name}</strong>
                          {resource.distanceMiles !== undefined && <span className="text-sm"> · {resource.distanceMiles} mi</span>}
                          {resource.address && <span className="block text-sm">{resource.address}</span>}
                          <span className="block text-sm"><span className={`font-semibold ${CHIP_TONE_CLASS[summary.chip.tone]}`}>{summary.chip.label}</span>{detail && <span className="text-muted-foreground"> · {detail}</span>}</span>
                          {explainResource(resource, preferences, feedback).map((reason) => <span key={reason} className="block text-xs">{reason}</span>)}
                          <span className="block text-xs text-muted-foreground">Source: {resource.source}. Call first to confirm current availability, eligibility, price, and hours. Distance is nearby straight-line context, not a promised route or detour time.</span>
                          <span className="block text-sm space-x-3 mt-1">
                            {resource.phone && <a className="underline text-primary" href={"tel:" + resource.phone.replace(/[^\d+]/g, "")}>Call</a>}
                            {resource.website && <a className="underline text-primary" href={resource.website} target="_blank" rel="noopener noreferrer">Website ↗</a>}
                            {resource.lat !== undefined && resource.lon !== undefined && <a className="underline text-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(resource.lat + "," + resource.lon)}`} target="_blank" rel="noopener noreferrer">Directions ↗</a>}
                          </span>
                          <div className="flex flex-wrap gap-2 mt-2 text-xs" aria-label={`Feedback for ${resource.name}`}>
                            {([["worked","Worked"],["closed","Closed"],["too-far","Too far"],["not-for-me","Not for me"]] as const).map(([value,label])=><button key={value} type="button" className="border rounded px-2 py-1" onClick={()=>recordFeedback(resource,value)}>{label}</button>)}
                            <button type="button" className="border rounded px-2 py-1" onClick={()=>toggleResourceWatch(resource)}>
                              {watchedKeys.includes(resourceKey(resource)) ? "Stop watching changes" : "Watch listing changes"}
                            </button>
                          </div>
                          <details className="mt-2 rounded border p-2 text-xs">
                            <summary className="cursor-pointer font-medium">Record a verification I made</summary>
                            <p className="mt-2 text-muted-foreground">Keep this separate from directory data. “Open / answering” does not promise a meal, bed, appointment, eligibility, stock, or price unless you explicitly confirmed that detail yourself.</p>
                            <label className="mt-2 block">How I checked
                              <select className="ml-2 rounded border bg-background p-1" value={verificationMethod} onChange={(event)=>setVerificationMethods((current)=>({ ...current, [key]: event.target.value as ResourceVerificationMethod }))}>
                                <option value="phone">Phone</option>
                                <option value="website">Website</option>
                                <option value="in-person">In person</option>
                                <option value="other">Other</option>
                              </select>
                            </label>
                            <label className="mt-2 block">Optional note
                              <input className="mt-1 block w-full rounded border bg-background p-1" maxLength={240} value={verificationNotes[key] ?? ""} onChange={(event)=>setVerificationNotes((current)=>({ ...current, [key]: event.target.value }))} placeholder="Example: answering calls; pantry hours confirmed for today" />
                            </label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <button type="button" className="border rounded px-2 py-1" onClick={()=>recordVerification(resource,"confirmed-open")}>I confirmed open / answering</button>
                              <button type="button" className="border rounded px-2 py-1" onClick={()=>recordVerification(resource,"confirmed-closed")}>I confirmed closed</button>
                              <button type="button" className="border rounded px-2 py-1" onClick={()=>recordVerification(resource,"could-not-confirm")}>Couldn’t confirm</button>
                            </div>
                          </details>
                          {verification && <div className="mt-2 rounded border border-primary/25 p-2 text-xs" data-testid="resource-verification">
                            <strong>{verificationLabel(verification)}.</strong>
                            <span className="block text-muted-foreground">Method: {verification.method} · checked {new Date(verification.verifiedAt).toLocaleString()} · expires {new Date(verification.expiresAt).toLocaleString()}.</span>
                            {verification.note && <span className="block">{verification.note}</span>}
                          </div>}
                        </li>
                        )
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No nearby listing matched your current filters. This does not mean no service exists.</p>
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

      {ranked && otherKinds.length > 0 && (
        <details className="rounded-lg border p-4">
          <summary className="font-medium cursor-pointer">More resources across the full Maslow framework</summary>
          <p className="text-sm text-muted-foreground mt-2">These are not inferred deficiencies. They are optional resources for connection, stability, independence and user-chosen goals.</p>
          <div className="mt-3 space-y-3">
            {MASLOW_LEVELS.map((level) => {
              const optionalKinds = (level.kinds as readonly ResourceKind[]).filter((kind) => otherKinds.includes(kind))
              if (optionalKinds.length === 0) return null
              return <div key={"other-" + level.id}>
                <h3 className="font-semibold">{level.title}</h3>
                <div className="text-sm space-y-1">{optionalKinds.map((kind) => {
                  const lookup = ranked[kind]
                  const first = lookup.results[0]
                  return <p key={"other-" + kind}>
                    <strong>{RESOURCE_LABELS[kind]}:</strong>{" "}
                    {first ? <>{first.name}{first.distanceMiles !== undefined ? " · " + first.distanceMiles + " mi" : ""}</> : "No nearby listing returned."}
                    {" "}<a className="underline text-primary" href={lookup.fallback[0]?.url || "https://www.211.org/get-help"} target="_blank" rel="noopener noreferrer">Directory ↗</a>
                  </p>
                })}</div>
              </div>
            })}
          </div>
        </details>
      )}
    </div>
  )
}
