"use client"

import { useSyncExternalStore } from "react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { CheckCircle, CalendarClock, Goal, Utensils, Info } from "lucide-react"
import { GUARDIAN_STORAGE_KEY, readGuardianState } from "@/lib/guardian-stability"

const subscribe = (onChange: () => void) => {
  const handler = (event: StorageEvent) => {
    if (event.key === null || event.key === GUARDIAN_STORAGE_KEY || event.key === "narcoguard_guardian_stability_v1") onChange()
  }
  window.addEventListener("storage", handler)
  window.addEventListener("narcoguard:guardian-change", onChange)
  return () => {
    window.removeEventListener("storage", handler)
    window.removeEventListener("narcoguard:guardian-change", onChange)
  }
}

const snapshot = () => {
  try {
    return localStorage.getItem(GUARDIAN_STORAGE_KEY) ?? localStorage.getItem("narcoguard_guardian_stability_v1") ?? ""
  } catch {
    return ""
  }
}

const serverSnapshot = () => ""

function localDate() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export function ActivityFeed() {
  useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const state = typeof window === "undefined" ? null : readGuardianState(window.localStorage)

  const items: { icon: typeof CheckCircle; text: string; detail: string }[] = []
  if (state?.enabled) {
    const today = state.entries.find((entry) => entry.date === localDate())
    if (today) {
      const answered = Object.keys(today.needs).length
      if (answered > 0) items.push({ icon: CheckCircle, text: "Today's needs check-in", detail: `${answered} need${answered === 1 ? "" : "s"} answered` })
      if ((today.meals?.length ?? 0) > 0) items.push({ icon: Utensils, text: "Meals logged today", detail: String(today.meals?.length ?? 0) })
    }

    const upcoming = state.plan
      .filter((item) => !item.done && item.date >= localDate())
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""))[0]
    if (upcoming) items.push({ icon: CalendarClock, text: upcoming.title, detail: `${upcoming.date}${upcoming.time ? ` at ${upcoming.time}` : ""}` })

    if (state.goals.length > 0) items.push({ icon: Goal, text: "Active goals", detail: String(state.goals.length) })
  }

  return (
    <HolographicCard className="p-6">
      <h3 className="text-lg font-semibold mb-4 font-orbitron">ACTIVITY FEED</h3>
      {items.length === 0 ? (
        <div className="flex items-start gap-3 p-3 rounded-lg glass">
          <div className="p-2 rounded-full bg-muted/20 text-muted-foreground"><Info className="w-4 h-4" /></div>
          <div>
            <p className="text-sm font-medium">No local activity yet</p>
            <p className="text-xs text-muted-foreground">Your own Guardian check-ins, meals, plans, and goals will appear here. NarcoGuard does not invent activity.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((activity) => (
            <div key={activity.text + activity.detail} className="flex items-start gap-3 p-3 rounded-lg glass">
              <div className="p-2 rounded-full bg-muted/20 text-primary">
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{activity.text}</p>
                <p className="text-xs text-muted-foreground">{activity.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </HolographicCard>
  )
}
