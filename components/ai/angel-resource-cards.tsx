"use client"

import { cardSummary } from "@/lib/resource-display"
import { directionsUrl } from "@/lib/safer-use"
import type { AngelResources } from "@/lib/angel-resources"
import type { NearbyResource } from "@/lib/resource-finder"

/**
 * One listing in an Angel reply: name, distance, hours as listed, source and "call first", with Call and Directions.
 * No "Open now" claim: the place may be in another time zone than the phone (a ZIP or travel search), so hours are
 * shown as listed, in the place's local time.
 */
export function AngelResourceCard({ resource }: { resource: NearbyResource }) {
  const summary = cardSummary(resource)
  const directions = directionsUrl(resource.lat, resource.lon)
  return (
    <li className="rounded-lg border p-3 space-y-1 break-words" data-testid="angel-resource-card">
      <p className="font-semibold">{resource.name}{resource.distanceMiles !== undefined && <span className="font-normal text-muted-foreground"> · {resource.distanceMiles} mi</span>}</p>
      {resource.address && <p className="text-muted-foreground">{resource.address}</p>}
      <p className="text-muted-foreground">{summary.hours ? `Listed hours (local time there): ${summary.hours}` : summary.chip.label}</p>
      {summary.freshness && <p className="text-xs text-muted-foreground">{summary.freshness}</p>}
      <div className="flex flex-wrap gap-2">
        {resource.phone && (
          <a className="inline-flex min-h-11 items-center rounded-lg border border-primary/50 px-3 font-semibold text-primary" href={`tel:${resource.phone.replace(/[^\d+]/g, "")}`}>Call {resource.phone}</a>
        )}
        {directions && (
          <a className="inline-flex min-h-11 items-center rounded-lg border px-3 text-primary" href={directions} target="_blank" rel="noopener noreferrer" data-testid="angel-directions">Directions<span className="sr-only"> to {resource.name} (opens Google Maps)</span></a>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Source: {resource.source}. Hours, openings and eligibility are not confirmed; call first.</p>
    </li>
  )
}

/** The listings attached to an Angel reply, grouped by need, with explicit "none found" and "not available" states. */
export function AngelResourceCards({ resources }: { resources: AngelResources }) {
  return (
    <div className="space-y-3 text-sm" data-testid="angel-resources">
      {resources.message && <p className="text-muted-foreground">{resources.message}</p>}
      {resources.groups.map((group) => (
        <section key={group.kind} aria-label={group.shortLabel} className="space-y-2">
          <h4 className="font-semibold">{group.label}</h4>
          {group.widenedMiles && group.results.length > 0 && <p className="text-xs text-muted-foreground">Nothing within 10 miles, so this searched up to {group.widenedMiles} miles.</p>}
          {group.results.length > 0 ? (
            <ul className="space-y-2">
              {group.results.map((resource) => <AngelResourceCard key={`${resource.name}-${resource.lat}-${resource.lon}`} resource={resource} />)}
            </ul>
          ) : (
            <p className="text-muted-foreground">
              {group.status === "ok" ? "No listing found nearby." : "This search is not available right now."}{" "}
              {group.fallback.map((link) => <a key={link.url} className="underline text-primary mr-2" href={link.url} target="_blank" rel="noreferrer">{link.title}</a>)}
              <a className="underline text-primary" href="tel:211">Call 211</a>
            </p>
          )}
        </section>
      ))}
    </div>
  )
}
