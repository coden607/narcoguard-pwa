"use client"

import { useId, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import type { NearbyResource } from "@/lib/resource-finder"
import { resourceKey } from "@/lib/resource-personalization"
import { ACCESSIBILITY_FIELDS, ACCESSIBILITY_VALUES, accessibilityDetails, accessibilityReport } from "@/lib/resource-accessibility"
import { validSourceUrl } from "@/lib/meeting-discovery"

type Correction = { id: string; proposed_text: string; source_url: string; created_at: string }

export function AccessibilityDetails({ resource }: { resource: NearbyResource }) {
  const id = useId()
  const [notice, setNotice] = useState("")
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [corrections, setCorrections] = useState<Correction[]>([])
  const [correctionNote, setCorrectionNote] = useState("")
  const resourceRef = `${resource.source}:${resourceKey(resource)}`
  async function loadCorrections() {
    if (loaded) return
    setLoaded(true)
    try {
      const response = await fetch(`/api/resources/corrections?resourceRef=${encodeURIComponent(resourceRef)}`, { cache: "no-store" })
      const body = await response.json()
      if (!response.ok) { setCorrectionNote("Published corrections are unavailable. Contact the provider to check accessibility."); return }
      setCorrections(Array.isArray(body.corrections) ? body.corrections.filter((row: Correction) => typeof row.proposed_text === "string" && validSourceUrl(row.source_url)) : [])
    } catch { setCorrectionNote("Published corrections could not be loaded. Contact the provider to check accessibility.") }
  }
  return <details className="rounded border p-3 text-sm" onToggle={(event) => { if (event.currentTarget.open) void loadCorrections() }}>
    <summary className="cursor-pointer min-h-8">Accessibility details and contributions</summary>
    <div className="pt-3 space-y-3">
      <dl className="space-y-2">{accessibilityDetails(resource).map((item) => <div key={item.field}><dt className="font-medium">{item.label}</dt><dd>{item.value} · Source: not provided · Updated: unknown</dd></div>)}</dl>
      <p>A general wheelchair map tag does not confirm these features. Ask the provider about your specific requirements before travelling. Unknown does not mean unavailable.</p>
      {resource.wheelchair && <p>General wheelchair tag: {resource.wheelchair}. Source: {resource.source}; listing updated: {resource.lastUpdated ?? "unknown"}. Specific entrance and restroom details remain unknown.</p>}
      {correctionNote && <p role="status">{correctionNote}</p>}
      {corrections.length > 0 && <section className="space-y-2" aria-label={`Published corrections for ${resource.name}`}><h4 className="font-semibold">Reviewed provider corrections</h4><p>Read each source for what it actually confirms; these notes do not automatically fill unknown accessibility fields.</p><ul className="space-y-2">{corrections.map((row) => <li key={row.id} className="border rounded p-2"><p>{row.proposed_text}</p><a href={row.source_url} target="_blank" rel="noopener noreferrer" className="underline text-primary inline-flex min-h-8 items-center">Correction source</a><p>Recorded: {row.created_at?.slice(0, 10) || "Unknown"}</p></li>)}</ul></section>}
      <details><summary className="cursor-pointer min-h-8">Contribute accessibility information for review</summary>
        <form className="space-y-3 pt-2" onSubmit={async (event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const report = accessibilityReport({ field: String(data.get("field")), value: String(data.get("value")), provenance: String(data.get("provenance")), observedAt: String(data.get("observedAt")) })
          if (!report) { setNotice("Choose a feature and value, add the source of your information, and enter a valid observation date."); return }
          setBusy(true); setNotice("")
          try {
            const response = await fetch("/api/resources/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceRef, ...report }) })
            if (response.status === 401) setNotice("Sign in to submit this contribution. Your form stays here; ordinary help remains available without an account.")
            else if (!response.ok) setNotice("The contribution was not submitted. Please try again later; your form stays here.")
            else setNotice("Contribution submitted for moderation. It has not changed the public listing.")
          } catch { setNotice("Could not submit the contribution. Check your connection and try again; your form stays here.") } finally { setBusy(false) }
        }}>
          <p>Requires sign-in to submit. Your source and observation go to the moderation queue, never directly into the listing. Do not include personal, medical or contact details.</p>
          <label htmlFor={`${id}-field`} className="block">Feature</label><select id={`${id}-field`} name="field" className="w-full rounded border bg-background p-2">{Object.entries(ACCESSIBILITY_FIELDS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <label htmlFor={`${id}-value`} className="block">What does the source say?</label><select id={`${id}-value`} name="value" defaultValue="unknown" className="w-full rounded border bg-background p-2">{Object.entries(ACCESSIBILITY_VALUES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <label htmlFor={`${id}-source`} className="block">Provenance: provider URL, provider conversation or direct observation</label><textarea id={`${id}-source`} name="provenance" required maxLength={700} rows={2} className="w-full rounded border bg-background p-2" />
          <label htmlFor={`${id}-date`} className="block">Date observed or confirmed with source</label><input id={`${id}-date`} name="observedAt" type="date" required className="w-full rounded border bg-background p-2" />
          <Button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit for review"}</Button>
          {notice && <p role="status">{notice}</p>}
          <Link href="/account" className="inline-flex min-h-8 items-center underline text-primary">Open account to sign in</Link>
        </form>
      </details>
      <Link href="/resources/review" className="inline-flex min-h-8 items-center underline text-primary">Resource corrections and review</Link>
    </div>
  </details>
}
