"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { HERO_RESOURCE_KINDS, HERO_RESOURCE_LABELS, type HeroResourceKind } from "@/lib/hero-alerts"

type HeroRequest = { id: string; kind: "emergency" | "resource"; resourceKind: HeroResourceKind | null; text: string }
type HeroStatus = {
  live?: boolean
  reason?: string
  authenticated?: boolean
  enrolled?: boolean
  available?: boolean
  paused?: boolean
  availableUntil?: number
  emergencyReady?: boolean
  naloxoneOnCall?: boolean
  resources?: HeroResourceKind[]
  requests?: HeroRequest[]
  accepted?: HeroRequest[]
  note?: string
}

const locationOnce = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!("geolocation" in navigator)) return reject(new Error("Location is unavailable in this browser."))
  navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 })
})

export function HeroAvailabilityPanel() {
  const [status, setStatus] = useState<HeroStatus>({})
  const [resources, setResources] = useState<HeroResourceKind[]>([])
  const [emergencyReady, setEmergencyReady] = useState(false)
  const [naloxoneOnCall, setNaloxoneOnCall] = useState(false)
  const [hours, setHours] = useState(2)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/heroes/alerts", { cache: "no-store" })
      const body = await response.json() as HeroStatus
      setStatus(body)
      if (body.resources) setResources(body.resources)
      if (body.emergencyReady !== undefined) setEmergencyReady(body.emergencyReady)
      if (body.naloxoneOnCall !== undefined) setNaloxoneOnCall(body.naloxoneOnCall)
    } catch {
      setNote("Hero Network could not be reached.")
    }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 15_000)
    return () => window.clearInterval(timer)
  }, [refresh])

  const action = async (payload: Record<string, unknown>) => {
    setBusy(true)
    setNote("")
    try {
      const response = await fetch("/api/heroes/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await response.json() as { error?: string; note?: string }
      setNote(body.error ?? body.note ?? "Updated.")
      await refresh()
    } catch {
      setNote("Hero Network could not be reached.")
    } finally {
      setBusy(false)
    }
  }

  const goAvailable = async () => {
    setBusy(true)
    setNote("Requesting location for this availability session…")
    try {
      const position = await locationOnce()
      await action({
        action: "available",
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        hours,
        consent: true,
        emergencyReady,
        naloxoneOnCall,
        resources,
      })
    } catch {
      setBusy(false)
      setNote("Location permission is required to appear in a nearby Hero area.")
    }
  }

  const toggleResource = (kind: HeroResourceKind) => {
    setResources((current) => current.includes(kind) ? current.filter((item) => item !== kind) : [...current, kind])
  }

  return <section className="rounded-xl border p-5 space-y-4" data-testid="hero-availability">
    <div>
      <h2 className="text-xl font-semibold">Hero availability</h2>
      <p className="text-sm text-muted-foreground">Choose exactly what you can offer right now. Your exact location is never published; the map uses an approximate area.</p>
    </div>

    {!status.live ? <p className="text-sm text-amber-300">{status.reason ?? "The live Hero Network is not enabled yet."}</p>
      : status.authenticated === false ? <p className="text-sm">Sign in and enroll as a certified Hero to go available.</p>
      : status.enrolled === false ? <p className="text-sm">Pass the Hero certification and enroll before going available.</p>
      : <>
        <fieldset className="space-y-2">
          <legend className="font-medium">Resources I can provide</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {HERO_RESOURCE_KINDS.map((kind) => <label key={kind} className="flex items-center gap-2 border rounded p-2">
              <input type="checkbox" checked={resources.includes(kind)} onChange={() => toggleResource(kind)} />
              <span>{HERO_RESOURCE_LABELS[kind]}</span>
            </label>)}
          </div>
        </fieldset>

        <label className="flex items-start gap-2 rounded border p-3">
          <input type="checkbox" checked={emergencyReady} onChange={(event) => setEmergencyReady(event.target.checked)} />
          <span><strong>Emergency responder mode.</strong> I am willing to respond to a nearby emergency request while EMS is coming.</span>
        </label>
        {emergencyReady && <label className="flex items-start gap-2 rounded border p-3">
          <input type="checkbox" checked={naloxoneOnCall} onChange={(event) => setNaloxoneOnCall(event.target.checked)} />
          <span>I confirm I am carrying naloxone/Narcan while on call and know how to use it. If I no longer have it, I will pause or end emergency availability.</span>
        </label>}

        <label className="block text-sm">Available for
          <select className="block mt-1 border rounded p-2 bg-background" value={hours} onChange={(event) => setHours(Number(event.target.value))}>
            {[1,2,4,8].map((value)=><option value={value} key={value}>{value} hour{value === 1 ? "" : "s"}</option>)}
          </select>
        </label>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void goAvailable()} disabled={busy || (!emergencyReady && resources.length === 0) || (emergencyReady && !naloxoneOnCall)}>
            {busy ? "Updating…" : status.available ? "Update availability" : "Go available"}
          </Button>
          {status.available && <Button variant="outline" onClick={() => void action({ action: "pause" })} disabled={busy}>Pause</Button>}
          {(status.available || status.paused) && <Button variant="destructive" onClick={() => void action({ action: "leave" })} disabled={busy}>End availability</Button>}
        </div>

        {status.availableUntil && <p className="text-xs text-muted-foreground">Availability ends {new Date(status.availableUntil).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} or earlier if you pause/end it.</p>}

        <div className="space-y-3">
          <h3 className="font-semibold">Nearby requests I can help with</h3>
          {(status.requests ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No matching open requests right now.</p> :
            (status.requests ?? []).map((request) => <article key={request.id} className="border rounded p-3 space-y-2">
              <p className="text-sm">{request.text}</p>
              <Button size="sm" onClick={() => void action({ action: "accept", requestId: request.id })} disabled={busy}>Accept request</Button>
            </article>)}
        </div>

        {(status.accepted ?? []).length > 0 && <div className="space-y-3">
          <h3 className="font-semibold">Accepted by me</h3>
          {(status.accepted ?? []).map((request) => <article key={request.id} className="border rounded p-3 space-y-2">
            <p className="text-sm">{request.text}</p>
            <p className="text-xs text-muted-foreground">NarcoGuard does not automatically reveal the requester&apos;s identity or exact location. For an emergency, keep 911 involved.</p>
            <Button size="sm" variant="outline" onClick={() => void action({ action: "complete", requestId: request.id })} disabled={busy}>Mark completed</Button>
          </article>)}
        </div>}
      </>}

    {note && <p role="status" className="text-sm">{note}</p>}
  </section>
}
