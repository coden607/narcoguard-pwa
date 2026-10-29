"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

type Summary = {
  connected?: boolean
  checkedAt?: string
  patient?: { name: string | null; birthDate: string | null } | null
  vitals?: { id?: string; name: string; value: string; unit: string | null; at: string | null }[]
  conditions?: { id?: string; name: string }[]
  encounters?: { id?: string; status: string; type: string | null; start: string | null }[]
  appointments?: { id?: string; status: string; start: string | null; description: string | null }[]
  goals?: { id?: string; description: string; status: string }[]
  unavailable?: string[]
  error?: string
}

const CALLBACK_ERRORS: Record<string, string> = {
  "access_denied": "UHS MyChart access was not approved. Nothing was connected.",
  "invalid-callback": "The UHS sign-in could not be verified. Please try connecting again.",
  "signed-out": "Sign in to NarcoGuard first, then connect UHS MyChart.",
  "not-configured": "UHS record connection is not available right now.",
  "token-exchange": "UHS did not complete the connection. Please try again.",
  "token-response": "UHS returned an incomplete connection. Please try again.",
}

export function UhsMyChartControls({ ready, callbackError, connected }: { ready: boolean; callbackError?: string; connected?: boolean }) {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(() => (callbackError ? CALLBACK_ERRORS[callbackError] ?? "UHS MyChart could not be connected. Please try again." : connected ? "UHS MyChart connected. Tap Load my UHS summary to read it." : ""))

  const load = async () => {
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/health/uhs/summary", { cache: "no-store" })
      const body = await response.json() as Summary
      if (response.status === 401) {
        setSummary(null)
        setMessage("Connect UHS MyChart first, then choose Load my UHS summary.")
        return
      }
      if (!response.ok) throw new Error(body.error || "UHS records could not be loaded.")
      setSummary(body)
      setMessage(body.unavailable?.length ? `UHS summary loaded for this session only. Not available right now: ${body.unavailable.join(", ")}.` : "UHS summary loaded for this session only.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "UHS records could not be loaded.")
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      const response = await fetch("/api/health/uhs/disconnect", { method: "POST" })
      if (!response.ok) throw new Error("disconnect failed")
      // Only a confirmed disconnect clears the view and announces it.
      setSummary(null)
      setMessage("UHS MyChart disconnected from this NarcoGuard session.")
    } catch {
      setMessage("UHS MyChart could not be disconnected. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  if (!ready) return message ? <p role="status" aria-live="polite" className="text-sm">{message}</p> : null

  return (
    <div className="space-y-4" data-testid="uhs-smart-controls">
      <div className="flex flex-wrap gap-2">
        <Button asChild><a href="/api/health/uhs/start">Connect UHS MyChart</a></Button>
        <Button type="button" variant="outline" onClick={() => void load()} disabled={busy}>{busy ? "Working…" : "Load my UHS summary"}</Button>
        <Button type="button" variant="ghost" onClick={() => void disconnect()} disabled={busy}>Disconnect UHS</Button>
      </div>
      <p className="text-xs text-muted-foreground">Records are fetched only when you tap Load. NarcoGuard does not save this summary to local storage or its database.</p>
      {message && <p role="status" aria-live="polite" className="text-sm">{message}</p>}
      {summary?.connected && (
        <div className="space-y-4 rounded-xl border p-4" data-testid="uhs-summary">
          <div>
            <h3 className="font-semibold">My UHS summary</h3>
            <p className="text-xs text-muted-foreground">Read-only · checked {summary.checkedAt ? new Date(summary.checkedAt).toLocaleString() : "just now"}</p>
          </div>
          {summary.patient && <p className="text-sm">{summary.patient.name || "Patient"}{summary.patient.birthDate ? ` · DOB ${summary.patient.birthDate}` : ""}</p>}
          <section>
            <h4 className="font-medium">Recent vital signs</h4>
            {summary.vitals?.length ? <ul className="list-disc pl-5 text-sm">{summary.vitals.map((item, index) => <li key={item.id || `${item.name}-${index}`}>{item.name}: {item.value}{item.unit ? ` ${item.unit}` : ""}{item.at ? ` · ${new Date(item.at).toLocaleString()}` : ""}</li>)}</ul> : <p className="text-sm text-muted-foreground">No vital-sign results returned.</p>}
          </section>
          <section>
            <h4 className="font-medium">Conditions</h4>
            {summary.conditions?.length ? <ul className="list-disc pl-5 text-sm">{summary.conditions.map((item, index) => <li key={item.id || `${item.name}-${index}`}>{item.name}</li>)}</ul> : <p className="text-sm text-muted-foreground">No conditions returned.</p>}
          </section>
          <section>
            <h4 className="font-medium">Visits</h4>
            {summary.encounters?.length ? <ul className="list-disc pl-5 text-sm">{summary.encounters.map((item, index) => <li key={item.id || index}>{item.type || "Visit"} · {item.status}{item.start ? ` · ${new Date(item.start).toLocaleString()}` : ""}</li>)}</ul> : <p className="text-sm text-muted-foreground">No visits returned.</p>}
          </section>
          <section>
            <h4 className="font-medium">Appointments</h4>
            {summary.appointments?.length ? <ul className="list-disc pl-5 text-sm">{summary.appointments.map((item, index) => <li key={item.id || index}>{item.description || "Appointment"} · {item.status}{item.start ? ` · ${new Date(item.start).toLocaleString()}` : ""}</li>)}</ul> : <p className="text-sm text-muted-foreground">No appointments returned.</p>}
          </section>
          <section>
            <h4 className="font-medium">Care goals</h4>
            {summary.goals?.length ? <ul className="list-disc pl-5 text-sm">{summary.goals.map((item, index) => <li key={item.id || index}>{item.description} · {item.status}</li>)}</ul> : <p className="text-sm text-muted-foreground">No care goals returned.</p>}
          </section>
        </div>
      )}
    </div>
  )
}
