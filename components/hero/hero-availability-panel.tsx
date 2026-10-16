"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { HERO_RESOURCE_KINDS, HERO_RESOURCE_LABELS, type HeroResourceKind } from "@/lib/hero-alerts"
import type { HeroContactHandoff } from "@/lib/hero-alerts"
import type { HeroRequestStatus } from "@/lib/hero-lifecycle"

type HeroRequest = {
  id: string
  kind: "emergency" | "resource"
  resourceKind: HeroResourceKind | null
  text: string
  status?: HeroRequestStatus
  meetingNote?: string | null
  location?: { lat: number; lon: number } | null
  contact?: HeroContactHandoff | null
}

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

const base64UrlToBytes = (value: string) => {
  const padding = "=".repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

const lifecycleLabel = (status?: HeroRequestStatus) => {
  if (status === "en_route") return "On the way"
  if (status === "arrived") return "Arrived"
  return "Accepted"
}

export function HeroAvailabilityPanel() {
  const [status, setStatus] = useState<HeroStatus>({})
  const [resources, setResources] = useState<HeroResourceKind[]>([])
  const [emergencyReady, setEmergencyReady] = useState(false)
  const [naloxoneOnCall, setNaloxoneOnCall] = useState(false)
  const [hours, setHours] = useState(2)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)

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

  const refreshPushState = useCallback(async () => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    setPushSupported(supported)
    if (!supported) return
    try {
      const registration = await navigator.serviceWorker.ready
      setPushEnabled(Boolean(await registration.pushManager.getSubscription()))
    } catch {
      setPushEnabled(false)
    }
  }, [])

  useEffect(() => {
    const first = window.setTimeout(() => {
      void refresh()
      void refreshPushState()
    }, 0)
    const timer = window.setInterval(() => void refresh(), 15_000)
    return () => { window.clearTimeout(first); window.clearInterval(timer) }
  }, [refresh, refreshPushState])

  const action = async (payload: Record<string, unknown>) => {
    setBusy(true)
    setNote("")
    try {
      const response = await fetch("/api/heroes/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await response.json() as { error?: string; note?: string; status?: string }
      setNote(body.error ?? body.note ?? (body.status ? `Request updated: ${body.status.replace("_", " ")}.` : "Updated."))
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

  const enablePush = async () => {
    setBusy(true)
    setNote("")
    try {
      if (!pushSupported) throw new Error("This browser does not support Web Push.")
      const configResponse = await fetch("/api/heroes/push", { cache: "no-store" })
      const config = await configResponse.json() as { configured?: boolean; publicKey?: string | null; error?: string }
      if (!configResponse.ok || !config.configured || !config.publicKey) throw new Error(config.error ?? "Hero notifications are not configured yet.")
      const permission = await Notification.requestPermission()
      if (permission !== "granted") throw new Error("Notification permission was not granted.")

      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(config.publicKey),
      })
      const response = await fetch("/api/heroes/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "subscribe", endpoint: subscription.endpoint }),
      })
      const body = await response.json() as { subscribed?: boolean; error?: string }
      if (!response.ok || !body.subscribed) throw new Error(body.error ?? "Could not enable Hero notifications.")
      setPushEnabled(true)
      setNote("Request notifications enabled. Notifications are generic and do not reveal the requested resource on your lock screen.")
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not enable Hero notifications.")
    } finally {
      setBusy(false)
    }
  }

  const disablePush = async () => {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch("/api/heroes/push", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsubscribe", endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setPushEnabled(false)
      setNote("Hero request notifications disabled.")
    } catch {
      setNote("Could not disable notifications.")
    } finally {
      setBusy(false)
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

        {pushSupported && <div className="rounded border p-3 space-y-2">
          <p className="text-sm font-medium">Request notifications</p>
          <p className="text-xs text-muted-foreground">Optional Web Push can alert you when the app is not open. The lock-screen message is generic and does not disclose what the person requested.</p>
          {pushEnabled
            ? <Button size="sm" variant="outline" onClick={() => void disablePush()} disabled={busy}>Disable notifications</Button>
            : <Button size="sm" variant="outline" onClick={() => void enablePush()} disabled={busy}>Enable request notifications</Button>}
        </div>}

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
          <h3 className="font-semibold">My active responses</h3>
          {(status.accepted ?? []).map((request) => <article key={request.id} className="border rounded p-3 space-y-2">
            <p className="text-sm"><strong>{lifecycleLabel(request.status)}</strong></p>
            <p className="text-sm">{request.text}</p>
            {request.meetingNote && <p className="text-sm"><strong>Meeting point:</strong> {request.meetingNote}</p>}
            {request.contact && <div className="rounded border p-2 text-sm">
              <strong>Requester-approved contact:</strong>{" "}
              {request.contact.method === "phone" || request.contact.method === "text"
                ? <a className="underline text-primary" href={`${request.contact.method === "text" ? "sms" : "tel"}:${request.contact.value.replace(/[^+0-9]/g, "")}`}>{request.contact.value}</a>
                : request.contact.method === "email"
                  ? <a className="underline text-primary" href={`mailto:${request.contact.value}`}>{request.contact.value}</a>
                  : <span>@{request.contact.value}</span>}
              <span className="block text-xs text-muted-foreground">Shared only for this accepted practical request. It is not pulled from the requester&apos;s profile.</span>
            </div>}
            {request.location && <a
              className="inline-block underline text-primary text-sm"
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(request.location.lat + "," + request.location.lon)}`}
              target="_blank"
              rel="noopener noreferrer"
            >Open requester-shared location ↗</a>}
            <p className="text-xs text-muted-foreground">Only the accepted Hero receives an exact location or contact method when the requester explicitly opted in. No unrelated profile details are included. For an emergency, keep 911 involved and follow EMS instructions.</p>
            <div className="flex flex-wrap gap-2">
              {request.status === "accepted" && <Button size="sm" onClick={() => void action({ action: "en-route", requestId: request.id })} disabled={busy}>I&apos;m on my way</Button>}
              {request.status === "en_route" && <Button size="sm" onClick={() => void action({ action: "arrive", requestId: request.id })} disabled={busy}>I&apos;ve arrived</Button>}
              {request.status === "arrived" && <Button size="sm" onClick={() => void action({ action: "complete", requestId: request.id })} disabled={busy}>Mark completed</Button>}
              {(request.status === "accepted" || request.status === "en_route") && <Button size="sm" variant="outline" onClick={() => void action({ action: "release", requestId: request.id })} disabled={busy}>Can&apos;t respond — release</Button>}
            </div>
          </article>)}
        </div>}
      </>}

    {note && <p role="status" className="text-sm">{note}</p>}
  </section>
}
