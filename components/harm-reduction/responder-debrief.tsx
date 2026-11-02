"use client"

import { useState } from "react"
import Link from "next/link"
import { DEBRIEF_FEELINGS, DEBRIEF_LINES, suggestionsFor, type DebriefFeeling } from "@/lib/responder-debrief"

/** A one-question check-in kept only in page state. Skipping is always one tap. */
export function ResponderDebrief() {
  const [feeling, setFeeling] = useState<DebriefFeeling | null>(null)
  const suggestions = suggestionsFor(feeling)

  return (
    <div className="space-y-6">
      <fieldset className="space-y-3 rounded-xl border p-5">
        <legend className="px-1 text-lg font-semibold">How are you right now? (optional, not saved)</legend>
        <div className="flex flex-wrap gap-2">
          {DEBRIEF_FEELINGS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={feeling === option.id}
              onClick={() => setFeeling(option.id)}
              className={`min-h-11 rounded-lg border px-4 ${feeling === option.id ? "border-primary bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        {suggestions.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm" role="status" data-testid="debrief-suggestions">
            {suggestions.map((line) => <li key={line}>{line}</li>)}
          </ul>
        )}
      </fieldset>

      <section aria-labelledby="talk" className="space-y-3">
        <h2 id="talk" className="text-xl font-semibold">Talk to someone</h2>
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="debrief-lines">
          {DEBRIEF_LINES.map((line) => (
            <li key={line.name} className="space-y-1 rounded-lg border p-3">
              <p className="font-semibold">{line.name}</p>
              <p className="text-sm text-muted-foreground">{line.what}</p>
              <div className="flex gap-3 text-sm">
                <a className="inline-flex min-h-11 items-center text-primary underline" href={`tel:${line.tel}`}>Call {line.display}</a>
                <a className="inline-flex min-h-11 items-center text-primary underline" href={`sms:${line.sms}`}>Text {line.display}</a>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-sm">Used your naloxone? <Link className="text-primary underline" href="/naloxone-card">Get more at a pharmacy</Link>.</p>
    </div>
  )
}
