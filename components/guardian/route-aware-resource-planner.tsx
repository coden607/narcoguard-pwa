"use client"

import { useEffect, useMemo, useState } from "react"
import type { PlanItem } from "@/lib/guardian-stability"
import { resourceKindsForNeeds } from "@/lib/maslow-resources"
import { RESOURCE_LABELS, type NearbyResource, type ResourceKind } from "@/lib/resource-finder"
import { extractPlanZip, rankResourcesForPlan, routeTimingFit, routeTimingLabel } from "@/lib/route-aware-planning"

type KindLookup = {
  status: "ok" | "unavailable"
  results: NearbyResource[]
  fallback: { title: string; url: string }[]
}

type NeedsLookup = {
  status: "ok" | "partial" | "unavailable"
  message?: string
  kinds: Record<ResourceKind, KindLookup>
}

export function RouteAwareResourcePlanner({ plan }: { plan: PlanItem | null }) {
  const zip = extractPlanZip(plan?.location)
  const kinds = plan?.need ? resourceKindsForNeeds([plan.need]) : []
  const [request, setRequest] = useState<{ key: string; data?: NeedsLookup; error?: string }>({ key: "" })
  const key = plan && zip ? [plan.id, plan.date, plan.time ?? "", zip, plan.need ?? ""].join("|") : ""
  const loading = Boolean(key) && request.key !== key
  const data = request.key === key ? request.data ?? null : null
  const error = request.key === key ? request.error ?? "" : ""

  useEffect(() => {
    if (!plan || !zip || kinds.length === 0 || !key) return
    const controller = new AbortController()
    fetch("/api/resources/needs?zip=" + encodeURIComponent(zip), { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as NeedsLookup | { error?: string }
        if (!response.ok && !("kinds" in body)) throw new Error(body.error || "Resource lookup is unavailable.")
        return body as NeedsLookup
      })
      .then((body) => {
        if (!controller.signal.aborted) setRequest({ key, data: body })
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setRequest({ key, error: cause instanceof Error ? cause.message : "Resource lookup is unavailable." })
      })
    return () => controller.abort()
  }, [key, kinds.length, plan, zip])

  const ranked = useMemo(() => {
    if (!plan || !data) return [] as NearbyResource[]
    return kinds.flatMap((kind) => rankResourcesForPlan(data.kinds[kind]?.results ?? [], plan).slice(0, 2))
  }, [data, kinds, plan])

  if (!plan || !zip || !plan.need) return null

  return <section className="rounded-xl border p-5 space-y-4" data-testid="route-aware-resource-planner">
    <div>
      <h2 className="text-xl font-semibold">Plan resources around your appointment</h2>
      <p className="text-sm text-muted-foreground">
        NarcoGuard is checking public resource listings near ZIP {zip} for your upcoming appointment “{plan.title}”
        {plan.time ? " at " + plan.time : ""}. This uses only the ZIP you typed into the plan. It does not track your route or background location.
      </p>
    </div>

    {loading && <p className="text-sm">Checking resources near the appointment ZIP…</p>}
    {error && <p className="text-sm">Appointment-area lookup failed: {error}</p>}
    {data?.message && <p className="text-sm">{data.message}</p>}

    {!loading && ranked.length === 0 && !error && <p className="text-sm text-muted-foreground">
      No matching listing was returned for this appointment area. This does not mean no resource exists.
    </p>}

    {ranked.length > 0 && <ul className="space-y-3">
      {ranked.map((resource) => {
        const fit = routeTimingFit(resource, plan)
        return <li key={[resource.kind, resource.name, resource.address ?? ""].join("|")} className="rounded-lg border p-3">
          <strong>{resource.name}</strong>
          <span className="block text-sm">{RESOURCE_LABELS[resource.kind]}{resource.distanceMiles !== undefined ? " · " + resource.distanceMiles + " mi from the appointment ZIP search point" : ""}</span>
          <span className="block text-sm text-muted-foreground">{routeTimingLabel(fit)}</span>
          {resource.address && <span className="block text-sm">{resource.address}</span>}
          <span className="block text-xs text-muted-foreground mt-1">Near the appointment ZIP is not the same as “on your route.” Call first to confirm current hours, eligibility, availability, stock, and price.</span>
          <span className="block text-sm space-x-3 mt-1">
            {resource.phone && <a className="underline text-primary" href={"tel:" + resource.phone.replace(/[^\d+]/g, "")}>Call</a>}
            {resource.website && <a className="underline text-primary" href={resource.website} target="_blank" rel="noopener noreferrer">Website ↗</a>}
            {resource.lat !== undefined && resource.lon !== undefined && <a className="underline text-primary" href={"https://www.google.com/maps/dir/?api=1&destination=" + encodeURIComponent(resource.lat + "," + resource.lon)} target="_blank" rel="noopener noreferrer">Directions ↗</a>}
          </span>
        </li>
      })}
    </ul>}

    <p className="text-xs text-muted-foreground">
      Timing uses listed machine-readable hours when available and only checks roughly two hours before, at, and two hours after the appointment. Unknown hours remain unknown.
    </p>
  </section>
}
