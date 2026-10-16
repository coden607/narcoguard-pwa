"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HERO_RESOURCE_LABELS } from "@/lib/hero-alerts"
import { heroWatchKindsForNeeds, unwatchablePredictedNeeds } from "@/lib/predicted-resource-watch"
import type { Need } from "@/lib/guardian-stability"

const needNames: Record<Need,string> = {
  food:"food",
  water:"water",
  sleep:"sleep",
  hygiene:"shower / hygiene",
  laundry:"laundry",
  safePlace:"safe place",
  connection:"connection",
  treatment:"treatment",
}

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

export function PredictedResourceWatchPanel({ predictedNeeds }: { predictedNeeds: readonly Need[] }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const kinds = useMemo(() => heroWatchKindsForNeeds(predictedNeeds), [predictedNeeds])
  const unwatchable = useMemo(() => unwatchablePredictedNeeds(predictedNeeds), [predictedNeeds])

  if (predictedNeeds.length === 0) return null

  const enable = async () => {
    setBusy(true)
    setNote("Requesting notification and approximate-location permission…")
    try {
      if (kinds.length === 0) throw new Error("None of the current predicted needs map to a Hero resource-watch category yet.")
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

      let latestExpiry = ""
      for (const resourceKind of kinds) {
        const response = await fetch("/api/resources/watch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "subscribe",
            endpoint: subscription.endpoint,
            resourceKind,
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          }),
        })
        const body = await response.json() as { subscribed?: boolean; expiresAt?: string; error?: string }
        if (response.status === 401) {
          setNote("Sign in first, then enable predicted-need background watches.")
          return
        }
        if (!response.ok || !body.subscribed) throw new Error(body.error ?? "Could not save a predicted resource watch.")
        if (body.expiresAt && body.expiresAt > latestExpiry) latestExpiry = body.expiresAt
      }

      setExpiresAt(latestExpiry)
      setNote("Background watches enabled for the currently supported predicted needs. They expire after 24 hours unless you renew them.")
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not enable predicted resource watches.")
    } finally {
      setBusy(false)
    }
  }

  return <section className="rounded-xl border border-primary/25 p-5 space-y-4" data-testid="predicted-resource-watch">
    <div className="flex items-start gap-3">
      <BellRing className="mt-1 h-5 w-5 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">Watch for predicted needs in the background</h2>
        <p className="text-sm text-muted-foreground">
          Optional. NarcoGuard can create 24-hour coarse-area watches for practical needs your local learner is currently surfacing. This sends only the selected resource categories and a coarse nearby area to the server; the neural history and score stay on this device.
        </p>
      </div>
    </div>

    <div className="rounded-lg border p-3 text-sm">
      <p><strong>Currently watchable:</strong> {kinds.length ? kinds.map((kind) => HERO_RESOURCE_LABELS[kind]).join(", ") : "none"}</p>
      {unwatchable.length > 0 && <p className="mt-1 text-muted-foreground"><strong>Still in-app only:</strong> {unwatchable.map((need) => needNames[need]).join(", ")}. NarcoGuard will preload public resources for these, but will not silently convert them into a different Hero-help category.</p>}
    </div>

    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => void enable()} disabled={busy || kinds.length === 0}>
        {busy ? "Enabling…" : "Enable 24-hour predicted watches"}
      </Button>
      <Button asChild variant="ghost"><Link href="/auth">Sign in</Link></Button>
    </div>

    {expiresAt && <p className="text-xs text-muted-foreground">Latest watch expires {new Date(expiresAt).toLocaleString()}.</p>}
    {note && <p className="text-sm" role="status">{note}</p>}
    <p className="text-xs text-muted-foreground">A notification means a matching Hero offered that resource nearby; it does not guarantee that the resource remains available. Call or confirm before traveling.</p>
  </section>
}
