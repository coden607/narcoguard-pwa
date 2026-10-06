"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  buildMorningBrief,
  clearDailyLifeState,
  defaultDailyLifeState,
  journalKindEnabled,
  readDailyLifeState,
  saveDailyLifeState,
  type DailyLifeState,
  type JournalKind,
} from "@/lib/daily-life"

const kinds: { id: JournalKind; label: string; placeholder: string }[] = [
  { id: "thought", label: "Thoughts", placeholder: "What is on your mind?" },
  { id: "mood", label: "Mood", placeholder: "How are you feeling today?" },
  { id: "gratitude", label: "Gratitude", placeholder: "Something you appreciate today…" },
  { id: "win", label: "Wins", placeholder: "Something you did that mattered…" },
]

const todayString = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const timeString = () => new Date().toTimeString().slice(0, 5)

export default function DailyLifePage() {
  const [state, setState] = useState<DailyLifeState | null>(null)
  const [now, setNow] = useState(timeString())
  const [routineTitle, setRoutineTitle] = useState("")
  const [routineTime, setRoutineTime] = useState("")
  const [scheduleTitle, setScheduleTitle] = useState("")
  const [scheduleDate, setScheduleDate] = useState(todayString())
  const [scheduleTime, setScheduleTime] = useState("")
  const [scheduleLocation, setScheduleLocation] = useState("")
  const [journalKind, setJournalKind] = useState<JournalKind>("thought")
  const [journalText, setJournalText] = useState("")
  const [weather, setWeather] = useState("")
  const [weatherStatus, setWeatherStatus] = useState("")

  useEffect(() => {
    setState(readDailyLifeState(window.localStorage))
    const timer = window.setInterval(() => setNow(timeString()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!state?.enabled || !state.modules.wakeReminder) return
    const target = state.wakeTime
    const maybeNotify = () => {
      if (timeString() !== target || document.visibilityState !== "visible") return
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("NarcoGuard wake reminder", { body: "Your chosen wake time is here. Open Daily Life for your morning brief." })
      }
    }
    maybeNotify()
    const timer = window.setInterval(maybeNotify, 30_000)
    return () => window.clearInterval(timer)
  }, [state?.enabled, state?.modules.wakeReminder, state?.wakeTime])

  const update = (next: DailyLifeState) => {
    saveDailyLifeState(window.localStorage, next)
    setState(next)
  }

  const brief = useMemo(() => state ? buildMorningBrief(state, todayString(), now, weather || undefined) : null, [state, now, weather])

  const requestWeather = () => {
    if (!navigator.geolocation) { setWeatherStatus("Location is unavailable on this device."); return }
    setWeatherStatus("Requesting your location for this one weather lookup…")
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const params = new URLSearchParams({ lat: String(position.coords.latitude), lon: String(position.coords.longitude) })
        const response = await fetch("/api/daily-life/weather?" + params, { cache: "no-store" })
        const body = await response.json() as { summary?: string; error?: string }
        if (!response.ok || !body.summary) throw new Error(body.error || "Weather lookup failed.")
        setWeather(body.summary)
        setWeatherStatus("Weather updated. Your location was used only for this lookup.")
      } catch (error) {
        setWeatherStatus(error instanceof Error ? error.message : "Weather lookup failed.")
      }
    }, () => setWeatherStatus("Location permission was not granted. Weather remains optional."), { enableHighAccuracy: false, timeout: 10_000, maximumAge: 900_000 })
  }

  if (!state) return <main className="p-6" role="status">Loading Daily Life…</main>
  if (!state.enabled) return <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
    <Link href="/" className="underline text-primary">← NarcoGuard dashboard</Link>
    <h1 className="text-3xl font-bold">Daily Life</h1>
    <p>Build a routine around what you want: wake-up prompts, schedule, journals, morning briefing and evening reset. Everything here is optional and stored in this browser.</p>
    <Button onClick={() => update({ ...defaultDailyLifeState(), enabled: true })}>Enable Daily Life</Button>
  </main>

  const enabledKinds = kinds.filter((kind) => journalKindEnabled(state, kind.id))
  const chosenKind = enabledKinds.some((kind) => kind.id === journalKind) ? journalKind : enabledKinds[0]?.id

  return <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-8">
    <nav><Link href="/" className="underline text-primary">← NarcoGuard dashboard</Link></nav>
    <header>
      <h1 className="text-3xl font-bold">Daily Life</h1>
      <p className="text-muted-foreground">Choose only the tools you want. NarcoGuard does not assume a routine, mood, goal, or journal style for you.</p>
    </header>

    <section className="border rounded-xl p-5 space-y-4">
      <h2 className="text-xl font-semibold">What I want available</h2>
      <div className="grid sm:grid-cols-2 gap-2">
        {(Object.keys(state.modules) as (keyof typeof state.modules)[]).map((key) => <label key={key} className="flex gap-2 items-center">
          <input type="checkbox" checked={state.modules[key]} onChange={(e) => update({ ...state, modules: { ...state.modules, [key]: e.target.checked } })} />
          <span>{({
            morningBrief: "Morning briefing", wakeReminder: "Wake reminder", schedule: "Daily schedule", routines: "Routines",
            thoughtJournal: "Thought journal", moodJournal: "Mood journal", gratitudeJournal: "Gratitude journal",
            winsJournal: "Wins journal", eveningReset: "Evening reset", weather: "Weather in morning brief",
          } as Record<string,string>)[key]}</span>
        </label>)}
      </div>
      <p className="text-xs text-muted-foreground">Turning a module off hides it; it does not silently delete prior entries.</p>
    </section>

    {(state.modules.morningBrief || state.modules.wakeReminder) && <section className="border rounded-xl p-5 space-y-4">
      <h2 className="text-xl font-semibold">Wake-up & morning brief</h2>
      <label className="block">Chosen wake time
        <input type="time" className="block border rounded p-2 bg-background" value={state.wakeTime} onChange={(e) => update({ ...state, wakeTime: e.target.value })} />
      </label>
      {state.modules.wakeReminder && <div className="space-y-2">
        <Button variant="outline" onClick={async () => {
          if (!("Notification" in window)) return
          await Notification.requestPermission()
          setState(readDailyLifeState(window.localStorage))
        }}>Allow browser notifications</Button>
        <p className="text-xs text-muted-foreground">The current PWA reminder works while Daily Life is active and may use browser notifications. It is not represented as a guaranteed background alarm.</p>
      </div>}
      {state.modules.weather && <div>
        <Button variant="outline" onClick={requestWeather}>Use my location for current weather</Button>
        {weatherStatus && <p className="text-sm mt-2">{weatherStatus}</p>}
      </div>}
      {state.modules.morningBrief && brief && <div className="rounded-lg border p-4 space-y-2" aria-live="polite">
        <strong>Right now: {now}</strong>
        {brief.summary.map((line) => <p key={line}>{line}</p>)}
      </div>}
    </section>}

    {state.modules.routines && <section className="border rounded-xl p-5 space-y-4">
      <h2 className="text-xl font-semibold">My routines</h2>
      <form className="grid sm:grid-cols-[1fr_auto_auto] gap-2" onSubmit={(e) => {
        e.preventDefault()
        if (!routineTitle.trim()) return
        update({ ...state, routines: [...state.routines, { id: crypto.randomUUID(), title: routineTitle.trim().slice(0,120), ...(routineTime ? { time: routineTime } : {}), enabled: true }] })
        setRoutineTitle(""); setRoutineTime("")
      }}>
        <input aria-label="Routine name" className="border rounded p-2 bg-background" placeholder="Breakfast, medication, meeting prep…" value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)} />
        <input aria-label="Routine time" type="time" className="border rounded p-2 bg-background" value={routineTime} onChange={(e) => setRoutineTime(e.target.value)} />
        <Button type="submit">Add</Button>
      </form>
      <ul className="space-y-2">{state.routines.map((item) => <li key={item.id} className="flex gap-3 items-center border rounded p-3">
        <input type="checkbox" checked={item.enabled} aria-label={`Enable ${item.title}`} onChange={() => update({ ...state, routines: state.routines.map((r) => r.id === item.id ? { ...r, enabled: !r.enabled } : r) })} />
        <span>{item.time ? item.time + " · " : ""}{item.title}</span>
        <button className="underline ml-auto" onClick={() => update({ ...state, routines: state.routines.filter((r) => r.id !== item.id) })}>Remove</button>
      </li>)}</ul>
    </section>}

    {state.modules.schedule && <section className="border rounded-xl p-5 space-y-4">
      <h2 className="text-xl font-semibold">My schedule</h2>
      <form className="grid sm:grid-cols-2 gap-2" onSubmit={(e) => {
        e.preventDefault()
        if (!scheduleTitle.trim()) return
        update({ ...state, schedule: [...state.schedule, { id: crypto.randomUUID(), date: scheduleDate, ...(scheduleTime ? { time: scheduleTime } : {}), title: scheduleTitle.trim().slice(0,160), ...(scheduleLocation.trim() ? { location: scheduleLocation.trim().slice(0,160) } : {}), done: false }] })
        setScheduleTitle(""); setScheduleTime(""); setScheduleLocation("")
      }}>
        <input aria-label="Schedule item" className="border rounded p-2 bg-background" placeholder="Work, treatment, court, appointment…" value={scheduleTitle} onChange={(e) => setScheduleTitle(e.target.value)} />
        <input aria-label="Schedule date" type="date" className="border rounded p-2 bg-background" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
        <input aria-label="Schedule time" type="time" className="border rounded p-2 bg-background" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
        <input aria-label="Schedule location" className="border rounded p-2 bg-background" placeholder="Location (optional)" value={scheduleLocation} onChange={(e) => setScheduleLocation(e.target.value)} />
        <Button type="submit" className="sm:col-span-2">Add to schedule</Button>
      </form>
      <ul className="space-y-2">{state.schedule.filter((i) => i.date >= todayString()).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time)).map((item) => <li key={item.id} className="flex gap-3 border rounded p-3">
        <input type="checkbox" checked={item.done} aria-label={`Complete ${item.title}`} onChange={() => update({ ...state, schedule: state.schedule.map((s) => s.id === item.id ? { ...s, done: !s.done } : s) })} />
        <span className={item.done ? "line-through" : ""}>{item.date}{item.time ? ` · ${item.time}` : ""}: {item.title}{item.location ? ` · ${item.location}` : ""}</span>
        <button className="underline ml-auto" onClick={() => update({ ...state, schedule: state.schedule.filter((s) => s.id !== item.id) })}>Remove</button>
      </li>)}</ul>
    </section>}

    {enabledKinds.length > 0 && <section className="border rounded-xl p-5 space-y-4">
      <h2 className="text-xl font-semibold">Journal</h2>
      <div className="flex flex-wrap gap-2">{enabledKinds.map((kind) => <Button key={kind.id} type="button" variant={chosenKind === kind.id ? "default" : "outline"} onClick={() => setJournalKind(kind.id)}>{kind.label}</Button>)}</div>
      {chosenKind && <form className="space-y-2" onSubmit={(e) => {
        e.preventDefault()
        if (!journalText.trim()) return
        update({ ...state, journal: [...state.journal, { id: crypto.randomUUID(), date: todayString(), kind: chosenKind, text: journalText.trim().slice(0,2000) }] })
        setJournalText("")
      }}>
        <textarea aria-label="Journal entry" className="w-full min-h-28 border rounded p-3 bg-background" placeholder={kinds.find((k) => k.id === chosenKind)?.placeholder} value={journalText} onChange={(e) => setJournalText(e.target.value)} />
        <Button type="submit">Save entry</Button>
      </form>}
      <div className="space-y-2">{state.journal.slice(-10).reverse().map((entry) => <article key={entry.id} className="border rounded p-3"><strong>{entry.date} · {entry.kind}</strong><p className="whitespace-pre-wrap">{entry.text}</p></article>)}</div>
    </section>}

    {state.modules.eveningReset && <section className="border rounded-xl p-5 space-y-3">
      <h2 className="text-xl font-semibold">Evening reset</h2>
      <p>Review what matters for tomorrow: unfinished schedule items, your first appointment, food/transport needs, clothes or laundry, phone/watch charging, and anything you want to move forward.</p>
      <p className="text-sm text-muted-foreground">This is a prompt, not a score. Skipping it never blocks help or other NarcoGuard features.</p>
    </section>}

    <section className="border rounded-xl p-5 space-y-3">
      <h2 className="text-xl font-semibold">Privacy & control</h2>
      <p className="text-sm">Daily Life data is stored in this browser. It is not automatically shared with Angel, Heroes, contacts, or analytics.</p>
      <Button variant="destructive" onClick={() => {
        if (window.confirm("Erase all Daily Life routines, schedule items, and journal entries from this browser?")) {
          clearDailyLifeState(window.localStorage)
          setState(defaultDailyLifeState())
        }
      }}>Erase Daily Life data</Button>
    </section>
  </main>
}
