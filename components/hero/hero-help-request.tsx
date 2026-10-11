"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { HERO_RESOURCE_KINDS, HERO_RESOURCE_LABELS, type HeroResourceKind } from "@/lib/hero-alerts"

type TrackedRequest = { id: string; token: string; kind: "emergency" | "resource"; resourceKind?: HeroResourceKind }

const STORAGE_KEY = "narcoguard_hero_request_v1"

const locationOnce = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!("geolocation" in navigator)) return reject(new Error("Location is unavailable in this browser."))
  navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 })
})

export function HeroHelpRequest() {
  const [kind, setKind] = useState<HeroResourceKind>("naloxone")
  const [called911, setCalled911] = useState(false)
  const [emergency, setEmergency] = useState(false)
  const [shareExact, setShareExact] = useState(false)
  const [meetingNote, setMeetingNote] = useState("")
  const [tracked, setTracked] = useState<TrackedRequest | null>(null)
  const [requestStatus, setRequestStatus] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) setTracked(JSON.parse(raw) as TrackedRequest)
      } catch {}
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!tracked) return
    const check = async () => {
      try {
        const response = await fetch(`/api/heroes/alerts?requestId=${encodeURIComponent(tracked.id)}&token=${encodeURIComponent(tracked.token)}`, { cache: "no-store" })
        const body = await response.json() as { request?: { status?: string; accepted?: boolean; completed?: boolean } }
        if (body.request?.status) setRequestStatus(body.request.status)
        if (body.request?.completed || body.request?.status === "cancelled" || body.request?.status === "expired") {
          window.clearInterval(timer)
        }
      } catch {}
    }
    void check()
    const timer = window.setInterval(() => void check(), 10_000)
    return () => window.clearInterval(timer)
  }, [tracked])

  const send = async () => {
    setBusy(true)
    setNote("Requesting your location once to find nearby Heroes…")
    try {
      const position = await locationOnce()
      const response = await fetch("/api/heroes/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emergency ? {
          action: "request",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          called911,
          shareExact,
        } : {
          action: "resource-request",
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          resourceKind: kind,
          shareExact,
          meetingNote: meetingNote.trim(),
        }),
      })
      const body = await response.json() as { sent?: boolean; requestId?: string; requestToken?: string; note?: string; error?: string }
      if (!response.ok || !body.sent || !body.requestId || !body.requestToken) {
        setNote(body.error ?? "The request could not be sent.")
        return
      }
      const next: TrackedRequest = {
        id: body.requestId,
        token: body.requestToken,
        kind: emergency ? "emergency" : "resource",
        ...(!emergency ? { resourceKind: kind } : {}),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      setTracked(next)
      setRequestStatus("open")
      setNote(body.note ?? "Request posted.")
    } catch {
      setNote("Location permission is required to find nearby Heroes.")
    } finally {
      setBusy(false)
    }
  }

  const cancel = async () => {
    if (!tracked) return
    setBusy(true)
    try {
      const response = await fetch("/api/heroes/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", requestId: tracked.id, requestToken: tracked.token }),
      })
      const body = await response.json() as { cancelled?: boolean; error?: string }
      if (body.cancelled) {
        setRequestStatus("cancelled")
        setNote("Request cancelled.")
        localStorage.removeItem(STORAGE_KEY)
      } else setNote(body.error ?? "Could not cancel the request.")
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    localStorage.removeItem(STORAGE_KEY)
    setTracked(null)
    setRequestStatus("")
    setNote("")
  }

  if (tracked) return <section className="rounded-xl border p-4 space-y-3" data-testid="hero-request-status">
    <h3 className="font-semibold">{tracked.kind === "emergency" ? "Emergency Hero request" : `${tracked.resourceKind ? HERO_RESOURCE_LABELS[tracked.resourceKind] : "Resource"} request`}</h3>
    <p className="text-sm">Status: <strong>{requestStatus || "checking…"}</strong></p>
    {requestStatus === "accepted" && <p className="text-sm">A matching Hero accepted the request. NarcoGuard still does not automatically share your identity or exact location. For emergencies, continue following 911.</p>}
    {requestStatus === "completed" && <p className="text-sm">The Hero marked this request completed.</p>}
    {requestStatus === "open" && <p className="text-sm text-muted-foreground">Nearby matching Heroes can see the request. A volunteer response is not guaranteed.</p>}
    <div className="flex gap-2">
      {requestStatus === "open" && <Button variant="outline" onClick={() => void cancel()} disabled={busy}>Cancel request</Button>}
      {["completed","cancelled","expired"].includes(requestStatus) && <Button variant="outline" onClick={clear}>Clear</Button>}
    </div>
    {note && <p role="status" className="text-sm">{note}</p>}
  </section>

  return <section className="rounded-xl border p-4 space-y-4" data-testid="hero-help-request">
    <div>
      <h3 className="font-semibold">Ask a nearby Hero</h3>
      <p className="text-sm text-muted-foreground">Request emergency backup or practical help. Your exact location and identity are not posted to the network.</p>
    </div>

    <label className="flex items-start gap-2 border rounded p-3">
      <input type="checkbox" checked={emergency} onChange={(event)=>setEmergency(event.target.checked)} />
      <span><strong>This is an emergency.</strong> I want a trained Hero as extra help while EMS is coming.</span>
    </label>

    {emergency ? <label className="flex items-start gap-2 border rounded p-3">
      <input type="checkbox" checked={called911} onChange={(event)=>setCalled911(event.target.checked)} />
      <span>I have called 911 or someone is calling now. Heroes supplement EMS; they do not replace it.</span>
    </label> : <label className="block text-sm">What do you need?
      <select className="block mt-1 w-full border rounded p-2 bg-background" value={kind} onChange={(event)=>setKind(event.target.value as HeroResourceKind)}>
        {HERO_RESOURCE_KINDS.map((value)=><option key={value} value={value}>{HERO_RESOURCE_LABELS[value]}</option>)}
      </select>
    </label>}

    <label className="flex items-start gap-2 border rounded p-3">
      <input type="checkbox" checked={shareExact} onChange={(event)=>setShareExact(event.target.checked)} />
      <span><strong>Share my exact location only with the Hero who accepts.</strong> NarcoGuard encrypts it at rest and clears it when the request is completed or cancelled.</span>
    </label>

    {!emergency && !shareExact && <label className="block text-sm">Public meeting point or handoff note
      <input
        className="block mt-1 w-full border rounded p-2 bg-background"
        maxLength={240}
        value={meetingNote}
        onChange={(event)=>setMeetingNote(event.target.value)}
        placeholder="Example: library front entrance. Do not include private medical details."
      />
    </label>}

    {emergency && !shareExact && <p className="text-xs text-amber-300">Emergency Hero dispatch needs your explicit permission to share the exact location with the Hero who accepts.</p>}

    <Button onClick={() => void send()} disabled={busy || (emergency && (!called911 || !shareExact)) || (!emergency && !shareExact && !meetingNote.trim())}>
      {busy ? "Posting…" : emergency ? "Request nearby emergency Hero" : `Request ${HERO_RESOURCE_LABELS[kind]}`}
    </Button>
    <p className="text-xs text-muted-foreground">NarcoGuard cannot guarantee a Hero or resource is available. For immediate danger, call 911.</p>
    {note && <p role="status" className="text-sm">{note}</p>}
  </section>
}
