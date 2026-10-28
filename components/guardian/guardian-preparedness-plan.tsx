"use client"

import Link from "next/link"
import { BatteryCharging, BusFront, CheckCircle2, HeartHandshake, PackageCheck } from "lucide-react"
import type { GuardianState, PreparednessItem } from "@/lib/guardian-stability"
import { PREPAREDNESS_ITEMS } from "@/lib/guardian-stability"

const labels: Record<PreparednessItem, { title: string; detail: string }> = {
  naloxone: {
    title: "Naloxone / Narcan",
    detail: "I have access to naloxone and know where it is.",
  },
  power: {
    title: "Phone power",
    detail: "I have a charger, cable, battery pack, or another charging plan.",
  },
  transit: {
    title: "Transportation",
    detail: "I have a transit, ride, or backup transportation plan.",
  },
  food: {
    title: "Food / water",
    detail: "I have a near-term food and water plan.",
  },
  hygiene: {
    title: "Hygiene basics",
    detail: "I have the hygiene supplies or access I want available.",
  },
  "medications-appointments": {
    title: "Medications / appointments",
    detail: "I have the medication-access or appointment plan I want ready. NarcoGuard does not ask for medication names here.",
  },
  "support-person": {
    title: "Support person",
    detail: "I know who I would contact if I want support.",
  },
}

export function GuardianPreparednessPlan({
  state,
  onChange,
}: {
  state: GuardianState
  onChange: (next: GuardianState) => void
}) {
  const selected = new Set(state.preparedness)
  const toggle = (item: PreparednessItem) => {
    const next = selected.has(item)
      ? state.preparedness.filter((current) => current !== item)
      : [...state.preparedness, item]
    onChange({ ...state, preparedness: next })
  }

  const complete = state.preparedness.length
  const total = PREPAREDNESS_ITEMS.length

  return <section className="rounded-xl border p-5 space-y-4" data-testid="preparedness-plan">
    <div className="flex items-start gap-3">
      <PackageCheck className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">Personal preparedness plan</h2>
        <p className="text-sm text-muted-foreground">
          Check only what you personally consider ready. Nothing is inferred, graded, or shared. This checklist stays with your private Guardian data on this device.
        </p>
      </div>
    </div>

    <div className="rounded border p-3 text-sm flex items-center gap-2">
      <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" />
      <span><strong>{complete} of {total}</strong> items marked ready by you.</span>
    </div>

    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">Preparedness checklist</legend>
      {PREPAREDNESS_ITEMS.map((item) => {
        const checked = selected.has(item)
        const Icon = item === "power" ? BatteryCharging
          : item === "transit" ? BusFront
            : item === "support-person" ? HeartHandshake
              : PackageCheck
        return <label key={item} className="flex items-start gap-3 rounded border p-3">
          <input
            type="checkbox"
            checked={checked}
            disabled={state.paused}
            onChange={() => toggle(item)}
            aria-label={labels[item].title}
          />
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span>
            <strong className="block">{labels[item].title}</strong>
            <span className="block text-xs text-muted-foreground">{labels[item].detail}</span>
          </span>
        </label>
      })}
    </fieldset>

    <p className="text-xs text-muted-foreground">
      A checked box means only that you marked it ready. NarcoGuard does not verify supplies, medication access, transportation, appointments, or another person&apos;s availability.
    </p>
    <p className="text-sm"><Link className="underline text-primary" href="/planning#naloxone-kit-journal">Manage my naloxone kit location journal</Link> in Private planning.</p>
  </section>
}
