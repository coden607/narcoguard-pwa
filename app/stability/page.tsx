"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  clearGuardianState, defaultGuardianState, NEEDS, readGuardianState, saveGuardianState, summarizePattern,
  type GuardianState, type Need, type NeedStatus,
} from "@/lib/guardian-stability"
import { normalizePostalCode, resourcesForNeed } from "@/lib/guardian-resources"
import { analyzePreventionPatterns, suggestedNeeds } from "@/lib/prevention-engine"
import { CalmingAudio } from "@/components/calming-audio"

const names: Record<Need, string> = {
  food: "Food", water: "Water", sleep: "Sleep", hygiene: "Shower / hygiene",
  laundry: "Laundry", safePlace: "Safe place", connection: "Connection", treatment: "Treatment support",
}
const localDate = (dayOffset = 0) => {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export default function StabilityPage() {
  const [state, setState] = useState<GuardianState | null>(null)
  const [goal, setGoal] = useState("")
  const [planTitle, setPlanTitle] = useState("")
  const [now, setNow] = useState("")
  useEffect(() => { setState(readGuardianState(window.localStorage)); setNow(localDate()) }, [])

  const update = (next: GuardianState) => {
    saveGuardianState(window.localStorage, next)
    setState(readGuardianState(window.localStorage))
  }
  if (!state || !now) return <main className="p-6" role="status">Loading your planner…</main>

  const today = state.entries.find((item) => item.date === now) ?? { date: now, needs: {} }
  const pattern = summarizePattern(state.entries)
  const prevention = analyzePreventionPatterns(state.entries, today)
  const suggested = suggestedNeeds(prevention)
  const needsHelp = NEEDS.filter((need) => today.needs[need] === "needs-help")
  const telephone = state.supportPhone.replace(/[^\d+]/g, "")

  const updateCheckIn = (need: Need, status: NeedStatus | undefined) => {
    const needs = { ...today.needs }
    if (status) needs[need] = status
    else delete needs[need]
    update({ ...state, entries: [...state.entries.filter((item) => item.date !== now), { ...today, needs }] })
  }

  return <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
    <nav><Link href="/" className="underline text-primary">← NarcoGuard dashboard</Link></nav>
    <header className="space-y-2">
      <h1 className="text-3xl font-bold">Guardian Stability</h1>
      <p className="text-muted-foreground">A private, optional place to plan around what matters to you. You choose what to record and which next step to take.</p>
    </header>
    {!state.enabled ? <section className="border rounded-xl p-6 space-y-4">
      <h2 className="text-xl font-semibold">Start on your terms</h2>
      <p>Your check-ins, sleep, goals and plans stay in this browser. Anyone with access to this browser may see them. Clearing browser data will erase them. This tool does not detect emergencies or guarantee that a service is available.</p>
      <Button onClick={() => update({ ...defaultGuardianState(), enabled: true })}>Enable my private planner</Button>
    </section> : <>
      <section className="border rounded-xl p-5 flex flex-wrap gap-3 items-center justify-between">
        <p className="font-medium">{state.paused ? "Tracking paused. Your existing entries remain here." : "Tracking on. Entries are saved only when you choose to record them."}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => update({ ...state, paused: !state.paused })}>{state.paused ? "Resume" : "Pause"}</Button>
          <Button variant="destructive" onClick={() => { if (window.confirm("Erase all Guardian check-ins, goals, plans and support contact from this browser?")) { clearGuardianState(window.localStorage); setState(defaultGuardianState()) } }}>Erase all Guardian data</Button>
        </div>
      </section>
      <section className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold">Today’s check-in</h2>
        <p className="text-sm text-muted-foreground">Unanswered means unknown. “Need help” opens resource paths below.</p>
        <div className="grid sm:grid-cols-2 gap-3">{NEEDS.map((need) => <label key={need} className="flex items-center justify-between gap-2 border rounded-lg p-3">
          <span>{names[need]}</span>
          <select disabled={state.paused} aria-label={`${names[need]} status`} className="bg-background border rounded p-1 max-w-[50%]" value={today.needs[need] ?? ""} onChange={(event) => updateCheckIn(need, event.target.value as NeedStatus || undefined)}>
            <option value="">Unknown</option><option value="met">Met</option><option value="needs-help">Need help</option>
          </select>
        </label>)}</div>
        <label className="block space-y-1">Hours slept last night (optional, your estimate)
          <input disabled={state.paused} type="number" min="0" max="24" step="0.5" className="block bg-background border rounded p-2 w-28" value={today.sleepHours ?? ""} onChange={(event) => {
            const value = event.target.value
            update({ ...state, entries: [...state.entries.filter((item) => item.date !== now), { ...today, sleepHours: value === "" ? undefined : Number(value) }] })
          }} />
        </label>
      </section>
      <section className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold">Your goals and tomorrow’s plan</h2>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (goal.trim()) { update({ ...state, goals: [...state.goals, goal.trim().slice(0, 160)] }); setGoal("") } }}>
          <input aria-label="New goal" disabled={state.paused} maxLength={160} className="bg-background border rounded p-2 flex-1 min-w-0" placeholder="A goal you choose" value={goal} onChange={(event) => setGoal(event.target.value)} />
          <Button disabled={state.paused} type="submit">Add goal</Button>
        </form>
        <ul className="space-y-2">{state.goals.map((item, index) => <li key={`${index}-${item}`} className="flex justify-between gap-2">{item}<button disabled={state.paused} className="underline" onClick={() => update({ ...state, goals: state.goals.filter((_, i) => i !== index) })}>Remove</button></li>)}</ul>
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); if (planTitle.trim()) { update({ ...state, plan: [...state.plan, { id: crypto.randomUUID(), date: localDate(1), title: planTitle.trim().slice(0, 160), done: false }] }); setPlanTitle("") } }}>
          <input aria-label="Tomorrow's task" disabled={state.paused} maxLength={160} className="bg-background border rounded p-2 flex-1 min-w-0" placeholder="One step for tomorrow" value={planTitle} onChange={(event) => setPlanTitle(event.target.value)} />
          <Button disabled={state.paused} type="submit">Plan it</Button>
        </form>
        {today.needs.food === "needs-help" && <p className="text-sm">Planning ahead could help: consider finding a pantry or meal for tomorrow. Check availability before you go.</p>}
        <ul className="space-y-2">{state.plan.filter((item) => item.date >= now).map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3">
          <input aria-label={`Mark ${item.title} complete`} disabled={state.paused} type="checkbox" checked={item.done} onChange={() => update({ ...state, plan: state.plan.map((candidate) => candidate.id === item.id ? { ...candidate, done: !candidate.done } : candidate) })} />
          <span className={item.done ? "line-through" : ""}>{item.date}: {item.title}</span>
          <button disabled={state.paused} className="underline ml-auto" onClick={() => update({ ...state, plan: state.plan.filter((candidate) => candidate.id !== item.id) })}>Remove</button>
        </li>)}</ul>
      </section>
      <section className="border rounded-xl p-5 space-y-4" aria-live="polite">
        <h2 className="text-xl font-semibold">Pre-warning & next action</h2>
        {prevention.level === "steady" ? <p>No change that needs attention is visible in the information you chose to record today. Unknown answers stay unknown.</p> : <>
          <p className="font-medium">{prevention.level === "support" ? "Several things you recorded today may deserve support." : "One or more things you recorded today may deserve attention."}</p>
          <ul className="list-disc pl-5 space-y-2">{prevention.signals.map((signal) => <li key={signal.id}><strong>{signal.label}.</strong> {signal.detail}</li>)}</ul>
          <p className="text-sm text-muted-foreground">This compares your voluntary entries with your own recent records. It is not a relapse probability, diagnosis, or proof that one event causes another.</p>
          {suggested.length > 0 && <p>Choose a small next step below for {suggested.map((need) => names[need]).join(", ")}. You remain in control of what happens next.</p>}
        </>}
        <CalmingAudio />
      </section>
      <section className="border rounded-xl p-5 space-y-4">
        <h2 className="text-xl font-semibold">Find a next step</h2>
        <label className="block">Your ZIP code (optional; enter it on the service directory)
          <input disabled={state.paused} inputMode="numeric" maxLength={10} className="block bg-background border rounded p-2" value={state.postalCode} onChange={(event) => update({ ...state, postalCode: event.target.value })} placeholder="ZIP code" />
        </label>
        {state.postalCode && !normalizePostalCode(state.postalCode) && <p className="text-sm">Enter a five-digit US ZIP code, or leave it blank.</p>}
        {needsHelp.length === 0 && <p className="text-muted-foreground">Mark a need above to see relevant starting points.</p>}
        {needsHelp.map((need) => <div key={need} className="space-y-2"><h3 className="font-semibold">{names[need]}</h3>{resourcesForNeed(need, normalizePostalCode(state.postalCode)).map((link) => <p key={link.url}><a href={link.url} target="_blank" rel="noopener noreferrer" className="underline text-primary">{link.title} ↗</a><span className="block text-sm text-muted-foreground">{link.description}</span></p>)}</div>)}
      </section>
      <section className="border rounded-xl p-5 space-y-3">
        <h2 className="text-xl font-semibold">Your patterns and support</h2>
        <p>{pattern ? `Of ${pattern.answered} days when you marked food as needing help and answered the connection question, you also marked connection as needing help ${pattern.observed} times (${pattern.percent}%). This describes your entries; it is not a prediction or proof of cause.` : "Not enough answered check-ins for a personal pattern yet. Five days with both food and connection answered are needed."}</p>
        <label className="block">Someone you choose to call (optional)
          <input disabled={state.paused} type="tel" maxLength={30} className="block bg-background border rounded p-2" value={state.supportPhone} onChange={(event) => update({ ...state, supportPhone: event.target.value })} placeholder="Phone number" />
        </label>
        {telephone.length >= 7 && <a href={`tel:${telephone}`} className="underline text-primary">Call my support person</a>}
        <p className="text-sm text-muted-foreground">NarcoGuard does not call or message anyone for you. No relapse risk score or emergency detection is provided here.</p>
      </section>
    </>}
  </main>
}
