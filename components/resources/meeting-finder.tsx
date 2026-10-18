"use client"

import { useEffect, useState } from "react"
import { MEETING_SOURCES, meetingState, normalizeMeeting, readMeetings, saveMeetings, type SavedMeeting } from "@/lib/meeting-discovery"
import { Button } from "@/components/ui/button"

export function MeetingFinder() {
  const [meetings, setMeetings] = useState<SavedMeeting[]>([])
  const [message, setMessage] = useState("")
  const [editing, setEditing] = useState<SavedMeeting | null>(null)
  useEffect(() => {
    const timer = window.setTimeout(() => setMeetings(readMeetings(window.localStorage)), 0)
    return () => window.clearTimeout(timer)
  }, [])
  function persist(next: SavedMeeting[]) {
    try { saveMeetings(window.localStorage, next); setMeetings(next); return true } catch { setMessage("This browser could not save changes. Your saved list has not changed."); return false }
  }
  return <section className="space-y-5" aria-label="Recovery meeting discovery">
    <p>Search a provider’s own finder for meetings. NarcoGuard does not import live schedules or confirm that a meeting is running. You can save the details you find on this phone.</p>
    <ul className="space-y-3">
      {MEETING_SOURCES.map((source) => <li key={source.url} className="rounded-lg border p-4 space-y-2">
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-primary underline">Find meetings with {source.name}</a>
        <p className="text-sm">{source.description}</p>
        <p className="text-xs text-muted-foreground">Source: {source.name}. Finder link reviewed October 17, 2026; individual meeting update dates and cancellation status are unknown here. Opening the finder shares your search with that provider.</p>
      </li>)}
    </ul>
    <p className="text-sm">Check the meeting’s timezone, latest update, format, accessibility and cancellation notices before travelling or joining. A listed schedule does not confirm attendance or availability. For help finding local services, <a className="underline text-primary" href="tel:211">call 211</a>.</p>
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Saved meeting details</h2>
      <p className="text-sm text-muted-foreground">Optional, stored only in this browser; visible to anyone using this browser. Save public listing links, not private join codes or personal information. No attendance tracking or reminders.</p>
      {meetings.length === 0 && <p>No meeting details saved.</p>}
      <ul className="space-y-3">{meetings.map((row) => <li key={row.id} className="rounded-lg border p-4 space-y-2">
        <h3 className="font-semibold">{row.name}</h3>
        <p>{meetingState(row)}</p>
        <p>Schedule: {row.schedule ?? "Unknown"} · Timezone: {row.timezone ?? "Unknown"}</p>
        <p className="text-sm">Provider update date: {row.updatedAt ?? "Unknown"} · You checked the source: {row.checkedAt ?? "Unknown"}</p>
        <a href={row.sourceUrl} className="inline-flex min-h-11 items-center underline text-primary break-all" target="_blank" rel="noopener noreferrer">Open saved source listing</a>
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setEditing(row)}>Edit {row.name}</Button><Button variant="outline" onClick={() => { if (persist(meetings.filter((item) => item.id !== row.id))) { setMessage("Meeting removed from this browser."); if (editing?.id === row.id) setEditing(null) } }}>Remove {row.name}</Button></div>
      </li>)}</ul>
      {meetings.length > 0 && <Button variant="outline" onClick={() => { if (persist([])) { setEditing(null); setMessage("All saved meeting details erased from this browser.") } }}>Erase all saved meeting details</Button>}
    </div>
    <form key={editing?.id ?? "new"} className="rounded-lg border p-4 space-y-3" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      const value = Object.fromEntries(data)
      const row = normalizeMeeting({ ...value, id: editing?.id ?? crypto.randomUUID() })
      if (!row) { setMessage("Enter a name and public HTTPS source URL. Use a valid timezone (for example America/New_York) or leave it unknown; check the dates."); return }
      if (!editing && meetings.length >= 50) { setMessage("Remove a saved meeting before adding another (50 maximum)."); return }
      if (persist([...meetings.filter((item) => item.id !== row.id), row])) { setMessage("Meeting details saved on this browser; availability is not confirmed."); setEditing(null); event.currentTarget.reset() }
    }}>
      <h2 className="text-lg font-semibold">{editing ? "Edit saved details" : "Save details from a provider listing"}</h2>
      {([
        ["name", "Meeting name", "text", true], ["sourceUrl", "Public provider listing URL", "url", true], ["schedule", "Schedule exactly as listed (leave blank if unknown)", "text", false], ["timezone", "Schedule timezone, e.g. America/New_York (blank if unknown)", "text", false], ["updatedAt", "Provider update date (blank if unknown)", "date", false], ["checkedAt", "Date you checked the source (blank if unknown)", "date", false],
      ] as const).map(([name, label, type, required]) => <label key={name} className="block text-sm space-y-1"><span>{label}</span><input className="block w-full min-w-0 rounded border bg-background p-2" name={name} type={type} required={required} maxLength={name === "sourceUrl" ? 600 : 240} defaultValue={editing?.[name] ?? ""} /></label>)}
      <label className="block text-sm space-y-1"><span>Status according to the source</span><select name="status" defaultValue={editing?.status ?? "unknown"} className="w-full rounded border bg-background p-2"><option value="unknown">Unknown</option><option value="listed">Listed by provider (not confirmed running)</option><option value="cancelled">Cancelled according to source</option></select></label>
      <div className="flex flex-wrap gap-2"><Button type="submit">Save meeting details</Button>{editing && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel editing</Button>}</div>
    </form>
    {message && <p role="status">{message}</p>}
  </section>
}
