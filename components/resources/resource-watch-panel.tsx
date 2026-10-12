"use client"

import { useState } from "react"
import Link from "next/link"
import { Bell, BellOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HERO_RESOURCE_KINDS, HERO_RESOURCE_LABELS, type HeroResourceKind } from "@/lib/hero-alerts"

const locationOnce = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!("geolocation" in navigator)) return reject(new Error("Location is unavailable in this browser."))
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    timeout: 10_000,
    maximumAge: 120_000,
  })
})

const base64UrlToBytes = (value: string) => {
  const padding = "=".repeat((4 - value.length % 4) % 4)
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from(raw, (char) => char.charCodeAt(0))
}

export function ResourceWatchPanel() {
  const [kind, setKind] = useState<HeroResourceKind>("water")
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [note, setNote] = useState("")

  const enable = async () => {
    setBusy(true)
    setNote("Requesting notification and approximate-location permission…")
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        throw new Error("This browser does not support Web Push.")
      }
      const configResponse = await fetch("/api/resources/watch", { cache: "no-store" })
      const config = await configResponse.json() as { configured?: boolean; publicKey?: string | null; error?: string }
      if (!configResponse.ok || !config.configured || !config.publicKey) throw new Error(config.error ?? "Notifications are not configured yet.")
      const permission = await Notification.requestPermission()
      if (permission !== "granted") throw new Error("Notification permission was not granted.")

      const position = await locationOnce()
      const registration = await navigator.serviceWorker.ready
      const existing = await registration.pushManager.getSubscription()
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(config.publicKey),
      })

      const response = await fetch("/api/resources/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          endpoint: subscription.endpoint,
          resourceKind: kind,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        }),
      })
      const body = await response.json() as { subscribed?: boolean; note?: string; error?: string }
      if (response.status === 401) {
        setNote("Sign in first, then enable the alert.")
        return
      }
      if (!response.ok || !body.subscribed) throw new Error(body.error ?? "Could not save this resource alert.")
      setEnabled(true)
      setNote(body.note ?? "Resource alert enabled for 24 hours.")
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not enable this resource alert.")
    } finally {
      setBusy(false)
    }
  }

  const disable = async () => {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch("/api/resources/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "unsubscribe", endpoint: subscription.endpoint }),
        })
      }
      setEnabled(false)
      setNote("Resource alert disabled.")
    } catch {
      setNote("Could not disable the resource alert.")
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-xl border border-primary/25 bg-card/40 p-5 space-y-4" data-testid="resource-watch">
    <div>
      <h2 className="text-xl font-semibold flex items-center gap-2"><Bell className="h-5 w-5 text-primary" />Notify me when help appears nearby</h2>
      <p className="text-sm text-muted-foreground">Choose one resource. NarcoGuard stores only a coarse nearby area for this 24-hour alert and sends a generic notification if an opted-in Hero offers a match.</p>
    </div>
    <label className="block text-sm">Resource
      <select className="mt-1 block w-full rounded border bg-background p-2" value={kind} onChange={(event)=>setKind(event.target.value as HeroResourceKind)}>
        {HERO_RESOURCE_KINDS.filter((value)=>value !== "other").map((value)=><option key={value} value={value}>{HERO_RESOURCE_LABELS[value]}</option>)}
      </select>
    </label>
    <div className="flex flex-wrap gap-2">
      {enabled
        ? <Button type="button" variant="outline" onClick={() => void disable()} disabled={busy}><BellOff className="mr-2 h-4 w-4" />Disable alert</Button>
        : <Button type="button" onClick={() => void enable()} disabled={busy}>{busy ? "Enabling…" : "Enable 24-hour alert"}</Button>}
      <Button asChild variant="ghost"><Link href="/auth">Sign in</Link></Button>
    </div>
    {note && <p className="text-sm" role="status">{note}</p>}
    <p className="text-xs text-muted-foreground">Alerts never guarantee that a resource remains available. Call or confirm before traveling. Emergency needs still use 911.</p>
  </section>
}
