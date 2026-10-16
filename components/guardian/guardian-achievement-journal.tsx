"use client"

import { useMemo, useState } from "react"
import { BookHeart } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { GuardianState, JournalEntryKind } from "@/lib/guardian-stability"

const kindLabel: Record<JournalEntryKind, string> = {
  win: "Win",
  resource: "Resource that worked",
}

export function GuardianAchievementJournal({
  state,
  onChange,
  today,
}: {
  state: GuardianState
  onChange: (next: GuardianState) => void
  today: string
}) {
  const [title, setTitle] = useState("")
  const [kind, setKind] = useState<JournalEntryKind>("win")

  const timeline = useMemo(() => {
    const manual = state.journal.map((entry) => ({
      id: `journal-${entry.id}`,
      date: entry.date,
      title: entry.title,
      label: kindLabel[entry.kind],
      removableId: entry.id,
    }))
    const completed = state.plan
      .filter((item) => item.done)
      .map((item) => ({
        id: `plan-${item.id}`,
        date: item.date,
        title: item.title,
        label: item.kind === "appointment" ? "Completed appointment" : "Completed stability action",
        removableId: null,
      }))

    return [...manual, ...completed]
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title))
      .slice(0, 100)
  }, [state.journal, state.plan])

  const addEntry = () => {
    const clean = title.trim()
    if (!clean) return
    onChange({
      ...state,
      journal: [
        ...state.journal,
        {
          id: crypto.randomUUID(),
          date: today,
          title: clean.slice(0, 160),
          kind,
        },
      ].slice(-100),
    })
    setTitle("")
  }

  return <section className="rounded-xl border p-5 space-y-4" data-testid="achievement-journal">
    <div className="flex items-start gap-3">
      <BookHeart className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
      <div>
        <h2 className="text-xl font-semibold">Private achievement journal</h2>
        <p className="text-sm text-muted-foreground">
          A local timeline of wins you choose to record plus plan items you marked complete. NarcoGuard does not infer that an appointment was kept or a resource worked unless you record it.
        </p>
      </div>
    </div>

    <form
      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
      onSubmit={(event) => {
        event.preventDefault()
        addEntry()
      }}
    >
      <input
        aria-label="Achievement or resource"
        disabled={state.paused}
        maxLength={160}
        className="rounded border bg-background p-2"
        placeholder="A win, or a resource that worked for you"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
      />
      <select
        aria-label="Journal entry type"
        disabled={state.paused}
        className="rounded border bg-background p-2"
        value={kind}
        onChange={(event) => setKind(event.target.value as JournalEntryKind)}
      >
        <option value="win">Win</option>
        <option value="resource">Resource that worked</option>
      </select>
      <Button disabled={state.paused || !title.trim()} type="submit">Add</Button>
    </form>

    {timeline.length === 0 ? <p className="text-sm text-muted-foreground">
      Nothing recorded yet. Completed plan items will appear here automatically only after you mark them done.
    </p> : <ol className="space-y-2">
      {timeline.map((item) => <li key={item.id} className="rounded border p-3">
        <div className="flex flex-wrap gap-2 items-center">
          <strong>{item.title}</strong>
          <span className="text-xs text-muted-foreground">{item.label} · {item.date}</span>
          {item.removableId && <button
            type="button"
            disabled={state.paused}
            className="ml-auto text-sm underline"
            onClick={() => onChange({
              ...state,
              journal: state.journal.filter((entry) => entry.id !== item.removableId),
            })}
          >
            Remove
          </button>}
        </div>
      </li>)}
    </ol>}
  </section>
}
