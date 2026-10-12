"use client"

import { useCallback, useEffect, useState } from "react"
import { HandHeart } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PRACTICAL_HELP_KINDS,
  PRACTICAL_HELP_LABELS,
  type PracticalHelpKind,
} from "@/lib/hero-practical-offers"

type OfferStatus = {
  live?: boolean
  authenticated?: boolean
  reason?: string
  note?: string
  offer?: {
    availableUntil: number
    resources: PracticalHelpKind[]
  } | null
}

const locationOnce = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!("geolocation" in navigator)) return reject(new Error("Location is unavailable in this browser."))
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: false,
    timeout: 10_000,
    maximumAge: 120_000,
  })
})

export function PracticalHelpOfferPanel() {
  const [status, setStatus] = useState<OfferStatus>({})
  const [resources, setResources] = useState<PracticalHelpKind[]>([])
  const [hours, setHours] = useState(2)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/heroes/practical-offers", { cache: "no-store" })
      const body = await response.json() as OfferStatus
      setStatus(body)
      if (body.offer?.resources) setResources(body.offer.resources)
    } catch {
      setNote("Practical-help offers could not be reached.")
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  const toggleResource = (kind: PracticalHelpKind) => {
    setResources((current) =>
      current.includes(kind)
        ? current.filter((item) => item !== kind)
        : [...current, kind],
    )
  }

  const publish = async () => {
    setBusy(true)
    setNote("Requesting location for this temporary practical-help offer…")
    try {
      const position = await locationOnce()
      const response = await fetch("/api/heroes/practical-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          consent: true,
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          hours,
          resources,
        }),
      })
      const body = await response.json() as { error?: string; note?: string }
      setNote(body.error ?? body.note ?? "Practical-help offer updated.")
      await refresh()
    } catch {
      setNote("Location permission is required to publish a nearby practical-help offer.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      const response = await fetch("/api/heroes/practical-offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove" }),
      })
      const body = await response.json() as { error?: string; note?: string }
      setNote(body.error ?? body.note ?? "Practical-help offer removed.")
      await refresh()
    } catch {
      setNote("Practical-help offer could not be removed.")
    } finally {
      setBusy(false)
    }
  }

  const activeUntil = status.offer?.availableUntil
    ? new Date(status.offer.availableUntil).toLocaleString()
    : null

  return <section className="rounded-xl border p-5 space-y-4" data-testid="practical-help-offers">
    <div className="flex items-start gap-3">
      <HandHeart className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">Offer practical help nearby</h2>
        <p className="text-sm text-muted-foreground">
          Publish a short-lived offer for food, rides, showers, charging, clothing, hygiene, shelter navigation, or other practical help. This is separate from emergency Hero certification and never makes you an emergency responder.
        </p>
      </div>
    </div>

    {!status.live ? <p className="text-sm text-amber-300">{status.reason ?? "Practical-help offers are not live yet."}</p>
      : status.authenticated === false ? <p className="text-sm">Sign in to publish a practical-help offer.</p>
      : <>
        <fieldset className="space-y-2">
          <legend className="font-medium">What I can offer for a limited time</legend>
          <div className="grid sm:grid-cols-2 gap-2">
            {PRACTICAL_HELP_KINDS.map((kind) => <label key={kind} className="flex items-center gap-2 rounded border p-2 text-sm">
              <input
                type="checkbox"
                checked={resources.includes(kind)}
                onChange={() => toggleResource(kind)}
              />
              <span>{PRACTICAL_HELP_LABELS[kind]}</span>
            </label>)}
          </div>
        </fieldset>

        <label className="block text-sm">
          Offer duration
          <select
            className="mt-1 block rounded border bg-background p-2"
            value={hours}
            onChange={(event) => setHours(Number(event.target.value))}
          >
            {[1, 2, 4, 8, 12].map((value) => <option key={value} value={value}>{value} hour{value === 1 ? "" : "s"}</option>)}
          </select>
        </label>

        <p className="text-xs text-muted-foreground">
          Your device location is converted immediately to an approximate ~5 km area. Exact coordinates are not stored in the practical-help offer.
        </p>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => void publish()}
            disabled={busy || resources.length === 0}
          >
            {busy ? "Updating…" : status.offer ? "Update practical-help offer" : "Publish practical-help offer"}
          </Button>
          {status.offer && <Button
            type="button"
            variant="outline"
            onClick={() => void remove()}
            disabled={busy}
          >
            Remove offer
          </Button>}
        </div>

        {activeUntil && <p className="text-sm">
          Active until {activeUntil}. Categories: {status.offer?.resources.map((kind) => PRACTICAL_HELP_LABELS[kind]).join(" · ")}.
        </p>}
      </>}

    {note && <p role="status" className="text-sm">{note}</p>}
    <p className="text-xs text-muted-foreground">
      Practical-help status is not emergency Hero status. Emergency response still requires current certification, explicit emergency-ready mode, naloxone-on-call attestation, and 911 remains primary.
    </p>
  </section>
}
