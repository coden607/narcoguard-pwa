"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  MAX_NOTE_LENGTH, RESULT_ADVICE, RESULT_LABELS, STRIP_KINDS, STRIP_RESULTS, TEST_STRIP_LOG_KEY,
  addEntry, countResults, parseStoredLog, removeEntry, type StripEntry, type StripKind, type StripResult,
} from "@/lib/test-strip-log"

function readLog(): StripEntry[] | null {
  try {
    return parseStoredLog(localStorage.getItem(TEST_STRIP_LOG_KEY))
  } catch {
    return null
  }
}

function today() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function TestStripLog() {
  // undefined while loading, null while off, an array while on.
  const [entries, setEntries] = useState<StripEntry[] | null | undefined>(undefined)
  const [kind, setKind] = useState<StripKind>("fentanyl")
  const [result, setResult] = useState<StripResult>("positive")
  const [note, setNote] = useState("")

  useEffect(() => {
    const load = () => setEntries(readLog())
    load()
    window.addEventListener("storage", load)
    return () => window.removeEventListener("storage", load)
  }, [])

  const save = (next: StripEntry[]) => {
    try {
      localStorage.setItem(TEST_STRIP_LOG_KEY, JSON.stringify(next))
      setEntries(next)
    } catch {
      setEntries(next) // Storage blocked: keep it on screen for this visit only.
    }
  }
  const erase = () => {
    if (!window.confirm("Erase the whole test-strip log from this phone?")) return
    try { localStorage.removeItem(TEST_STRIP_LOG_KEY) } catch { /* nothing stored */ }
    setEntries(null)
  }

  if (entries === undefined) return <p role="status">Loading…</p>

  if (entries === null) {
    return (
      <div className="space-y-3 rounded-xl border p-5">
        <p>The log is off, and nothing is stored. If you turn it on, results stay only in this browser on this phone. They are never sent or backed up.</p>
        <p className="text-sm text-amber-200">There is no app PIN yet, so anyone who can open this browser could read the log. You can erase it any time.</p>
        <Button type="button" onClick={() => save([])}>Turn on my private log</Button>
      </div>
    )
  }

  const counts = countResults(entries)
  return (
    <div className="space-y-5">
      <form
        className="space-y-3 rounded-xl border p-5"
        onSubmit={(event) => {
          event.preventDefault()
          save(addEntry(entries, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: today(), kind, result, note }))
          setNote("")
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Strip
            <select className="mt-1 block w-full rounded border bg-background p-2" value={kind} onChange={(event) => setKind(event.target.value as StripKind)}>
              {STRIP_KINDS.map((option) => <option key={option} value={option}>{option === "fentanyl" ? "Fentanyl" : "Xylazine"}</option>)}
            </select>
          </label>
          <label className="text-sm">Result
            <select className="mt-1 block w-full rounded border bg-background p-2" value={result} onChange={(event) => setResult(event.target.value as StripResult)}>
              {STRIP_RESULTS.map((option) => <option key={option} value={option}>{RESULT_LABELS[option]}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm">Note (optional, stays on this phone)
          <input className="mt-1 block w-full rounded border bg-background p-2" maxLength={MAX_NOTE_LENGTH} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
        <p className="text-sm" role="status">{RESULT_ADVICE[result]}</p>
        <Button type="submit">Add to my log</Button>
      </form>

      <section aria-labelledby="log" className="space-y-2">
        <h2 id="log" className="text-xl font-semibold">My results</h2>
        <p className="text-sm text-muted-foreground" data-testid="strip-counts">{counts.total} logged: {counts.positive} positive, {counts.negative} negative, {counts.unclear} unclear.</p>
        <ul className="space-y-2" data-testid="strip-entries">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm">
              <span>{entry.date} · {entry.kind === "fentanyl" ? "Fentanyl" : "Xylazine"} · {RESULT_LABELS[entry.result]}{entry.note ? ` · ${entry.note}` : ""}</span>
              <button type="button" className="min-h-11 text-primary underline" onClick={() => save(removeEntry(entries, entry.id))}>Delete</button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" onClick={erase}>Erase my whole log</Button>
      </section>
    </div>
  )
}
