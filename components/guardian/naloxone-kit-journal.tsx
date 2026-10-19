"use client"

import { useState } from "react"
import { PackagePlus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GuardianState } from "@/lib/guardian-stability"
import { naloxoneKitFreshness } from "@/lib/naloxone-kit-journal"

export function NaloxoneKitJournal({
  state,
  today,
  onChange,
}: {
  state: GuardianState
  today: string
  onChange: (next: GuardianState) => void
}) {
  const [location, setLocation] = useState("")
  const [checkedOn, setCheckedOn] = useState(today)

  const add = () => {
    const label = location.trim().slice(0, 100)
    if (!label || !/^\d{4}-\d{2}-\d{2}$/.test(checkedOn)) return
    onChange({
      ...state,
      naloxoneKits: [
        ...state.naloxoneKits,
        { id: crypto.randomUUID(), location: label, checkedOn },
      ].slice(-20),
    })
    setLocation("")
    setCheckedOn(today)
  }

  const remove = (id: string) => onChange({
    ...state,
    naloxoneKits: state.naloxoneKits.filter((kit) => kit.id !== id),
  })

  const markCheckedToday = (id: string) => onChange({
    ...state,
    naloxoneKits: state.naloxoneKits.map((kit) => kit.id === id ? { ...kit, checkedOn: today } : kit),
  })

  return (
    <section className="rounded-xl border p-5 space-y-4" data-testid="naloxone-kit-journal">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Naloxone kit location journal</h2>
        <p className="text-sm text-muted-foreground">
          Record where you keep kits using labels such as “backpack,” “glovebox,” or “bedside drawer.” This stays in your Guardian data on this device and is erased with the planner.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] items-end">
        <label className="text-sm">
          Where I keep a kit
          <input
            disabled={state.paused}
            value={location}
            maxLength={100}
            onChange={(event) => setLocation(event.target.value)}
            className="mt-1 block w-full rounded border bg-background p-2"
            placeholder="Backpack, glovebox, bedside drawer…"
          />
        </label>
        <label className="text-sm">
          Last checked
          <input
            disabled={state.paused}
            type="date"
            value={checkedOn}
            max={today}
            onChange={(event) => setCheckedOn(event.target.value)}
            className="mt-1 block rounded border bg-background p-2"
          />
        </label>
        <Button type="button" disabled={state.paused || !location.trim()} onClick={add}>
          <PackagePlus className="mr-2 h-4 w-4" aria-hidden="true" />Add kit
        </Button>
      </div>

      {state.naloxoneKits.length === 0 ? (
        <p className="text-sm text-muted-foreground">No kit locations recorded.</p>
      ) : (
        <ul className="space-y-2">
          {state.naloxoneKits.map((kit) => {
            const freshness = naloxoneKitFreshness(kit.checkedOn, today)
            return (
              <li key={kit.id} className="rounded border p-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong>{kit.location}</strong>
                  <p className="text-sm text-muted-foreground">
                    Location last checked {kit.checkedOn}.
                    {freshness === "check-is-old" ? " This location check is over 90 days old." : ""}
                    {freshness === "future-date" ? " Check date needs correction." : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={state.paused} onClick={() => markCheckedToday(kit.id)}>
                    Checked today
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={state.paused} onClick={() => remove(kit.id)} aria-label={`Remove ${kit.location}`}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        “Last checked” means only that you confirmed where you keep the kit. It does not verify the medication’s expiration date, condition, or availability.
      </p>
    </section>
  )
}
