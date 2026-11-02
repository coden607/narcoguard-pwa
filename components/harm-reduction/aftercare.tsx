"use client"

import { useState } from "react"
import Link from "next/link"
import { Phone } from "lucide-react"
import { useWakeLock } from "@/lib/hooks/use-wake-lock"
import { AFTERCARE_STEPS, GOOD_SAMARITAN_NOTE, RESTOCK_STEPS } from "@/lib/aftercare"
import { GOOD_SAMARITAN_LAWS, goodSamaritanLawFor } from "@/lib/good-samaritan-laws"

export function Aftercare() {
  const awake = useWakeLock(true)
  const [state, setState] = useState("")
  const law = goodSamaritanLawFor(state)

  return (
    <div className="space-y-6">
      <a href="tel:911" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-red-600 text-xl font-bold text-white hover:bg-red-700">
        <Phone className="h-6 w-6" aria-hidden="true" />Call 911
      </a>
      {awake && <p className="text-xs text-muted-foreground" role="status">The screen will stay on while this page is open.</p>}

      <ol className="space-y-3" data-testid="aftercare-steps">
        {AFTERCARE_STEPS.map((step, index) => (
          <li key={step.title} className="rounded-xl border p-4">
            <h2 className="text-lg font-semibold">{index + 1}. {step.title}</h2>
            <p className="mt-1">{step.detail}</p>
          </li>
        ))}
      </ol>

      <section aria-labelledby="good-samaritan" className="space-y-2 rounded-xl border p-4" data-testid="aftercare-good-samaritan">
        <h2 id="good-samaritan" className="text-lg font-semibold">Calling 911 and the law</h2>
        <p className="text-sm">{GOOD_SAMARITAN_NOTE}</p>
        <label className="block text-sm">
          Your state (optional, not saved)
          <select className="mt-1 block w-full rounded border bg-background p-2" value={state} onChange={(event) => setState(event.target.value)}>
            <option value="">Choose a state</option>
            {GOOD_SAMARITAN_LAWS.map((entry) => <option key={entry.name} value={entry.name}>{entry.name}</option>)}
          </select>
        </label>
        {law && (
          <p className="text-sm" role="status"><strong>{law.citation}:</strong> {law.summary}{law.limits ? ` ${law.limits}` : ""} This is a summary, not legal advice.</p>
        )}
      </section>

      <section aria-labelledby="restock" className="space-y-2 rounded-xl border p-4" data-testid="aftercare-restock">
        <h2 id="restock" className="text-lg font-semibold">Restock your kit</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {RESTOCK_STEPS.map((step) => <li key={step}>{step}</li>)}
        </ul>
        <p className="text-sm">Get more: <Link className="text-primary underline" href="/naloxone-card">ask a pharmacist</Link> or see free options on <Link className="text-primary underline" href="/safer-use">Stay safer</Link>.</p>
      </section>
    </div>
  )
}
