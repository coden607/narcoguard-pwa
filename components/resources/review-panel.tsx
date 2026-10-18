"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"

type Kind = "report" | "correction" | "duplicate" | "appeal"
type Item = { id: string; kind: Kind; resource_ref?: string; target_ref?: string; parent_id?: string; proposed_text?: string; details?: string; status: string; resolution?: string; decision_reason?: string; verification_note?: string; source_url?: string; observed_at?: string; observed_timezone?: string; observed_hours?: string }
const endpoint = (kind: Kind) => `/api/resources/${kind === "report" ? "reports" : kind === "correction" ? "corrections" : kind === "duplicate" ? "duplicates" : "appeals"}`
const inputClass = "w-full min-w-0 rounded-lg border border-white/25 bg-black/30 p-3 text-white"
const buttonClass = "min-h-11 rounded-lg border border-white/30 px-4 py-2 disabled:opacity-50"

export function ResourceReviewPanel() {
  const [type, setType] = useState("report")
  const [items, setItems] = useState<Item[]>([])
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [queue, setQueue] = useState(false)
  const [reviewer, setReviewer] = useState(false)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [parent, setParent] = useState("")
  const [reportStatus, setReportStatus] = useState("open")
  const loadVersion = useRef(0)
  const load = useCallback(async () => {
    const version = ++loadVersion.current
    const kinds: Kind[] = ["report", "correction", "duplicate", "appeal"]
    try {
      const results = await Promise.all(kinds.map(async kind => {
        const res = await fetch(`${endpoint(kind)}?${kind === "report" ? queue ? `status=${reportStatus}` : "own=true" : `queue=${queue}`}`, { cache: "no-store" })
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || "Could not load private review status.")
        return { kind, body }
      }))
      if (version !== loadVersion.current) return
      setItems(results.flatMap(({ kind, body }) => (body.reports ?? body.items ?? []).map((item: Item) => ({ ...item, kind }))))
      setReviewer(results.some(({ body }) => body.reviewer === true))
    } catch (error) { if (version === loadVersion.current) { setItems([]); setMessage(error instanceof Error ? error.message : "Review is unavailable.") } }
  }, [queue, reportStatus])
  useEffect(() => {
    let active = true
    void Promise.resolve().then(() => { if (active) void load() })
    return () => { active = false }
  }, [load])

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const fields = new FormData(form)
    const kind: Kind = type === "hours" ? "report" : type as Kind
    const details = String(fields.get("text") ?? "")
    const observed = String(fields.get("observedAt") ?? "")
    const payload = kind === "report" ? { resourceRef: fields.get("resourceRef"), reason: "incorrect", details, ...(type === "hours" ? { reportType: "hours", observedAt: new Date(observed).toISOString(), observedTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone, observedHours: fields.get("observedHours") } : {}) } : { resourceRef: fields.get("resourceRef"), targetRef: fields.get("targetRef"), text: details, sourceUrl: fields.get("sourceUrl"), parentId: parent }
    setLoading(true)
    try {
      const res = await fetch(endpoint(kind), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Submission failed; your draft remains here.")
      form.reset(); setParent("")
      setMessage(`Submitted for review. Reference: ${body.id}. No listing information was changed.`)
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : "Submission failed; your draft remains here.") }
    finally { setLoading(false) }
  }

  async function decide(item: Item, action: string) {
    if (!notes[item.id]?.trim()) { setMessage("Provide a review reason before deciding."); return }
    setLoading(true)
    try {
      const payload = item.kind === "report" ? { id: item.id, to: action, note: notes[item.id] } : { id: item.id, action, reason: notes[item.id] }
      const res = await fetch(endpoint(item.kind), { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || "Decision failed.")
      setMessage("Review decision recorded.")
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : "Decision failed.") }
    finally { setLoading(false) }
  }

  return <main className="mx-auto min-h-screen max-w-3xl space-y-6 px-4 py-10 text-white">
    <Link href="/stability" className="underline">Back to Guardian resources</Link>
    <h1 className="text-3xl font-bold">Resource review</h1>
    <p>Sign in to submit and follow private reports. Reporter identity stays private. Avoid personal health, contact or location history in free text.</p>
    <p>Reports do not replace provider hours automatically. Provider corrections require a human identity check and publication review. Original source information remains available.</p>
    <p role="status" aria-live="polite" className="break-words">{message}</p>
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-white/20 p-4">
      <label className="block">Report type<select className={inputClass} value={type} onChange={event => setType(event.target.value)}>
        <option value="report">Inaccurate listing</option><option value="hours">Inaccurate hours</option><option value="correction">Provider correction</option><option value="duplicate">Possible duplicate</option><option value="appeal">Appeal a report decision</option>
      </select></label>
      {type !== "appeal" && <label className="block">Source-scoped resource reference<input name="resourceRef" required maxLength={512} placeholder="source:listing-id" className={inputClass} /></label>}
      {type === "duplicate" && <label className="block">Canonical resource reference<input name="targetRef" required maxLength={512} className={inputClass} /></label>}
      {type === "appeal" && <label className="block">Your report reference<input value={parent} onChange={event => setParent(event.target.value)} required className={inputClass} /><span className="text-sm">Appeals require your own resolved or dismissed report with a reason. A different reviewer decides the appeal.</span></label>}
      {["correction", "duplicate"].includes(type) && <label className="block">Public evidence source URL<input name="sourceUrl" type="url" required maxLength={2000} className={inputClass} /></label>}
      {type === "correction" && <p>A claim of provider identity is not verification. Reviewers must confirm through an independently sourced provider contact before publication.</p>}
      {type === "hours" && <><label className="block">Observed local time<input name="observedAt" type="datetime-local" required className={inputClass} /></label><p className="text-sm">Your device timezone is recorded with this observation.</p><label className="block">What hours did you observe?<input name="observedHours" required maxLength={500} className={inputClass} /></label></>}
      <label className="block">Details or proposed correction<textarea name="text" required maxLength={2000} rows={4} className={inputClass} /></label>
      <button disabled={loading} type="submit" className={buttonClass}>Submit for review</button>
    </form>
    <section className="space-y-4" aria-label="Review status">
      <h2 className="text-xl font-semibold">{queue ? "Reviewer queue" : "Your submissions and decisions"}</h2>
      <div className="flex flex-wrap gap-2"><button className={buttonClass} disabled={loading} onClick={() => { setMessage(""); void load() }}>Refresh status</button><button className={buttonClass} disabled={loading} onClick={() => setQueue(!queue)}>{queue ? "Show my submissions" : "Open reviewer queue"}</button></div>
      {queue && <label className="block">Report queue status<select value={reportStatus} onChange={event => setReportStatus(event.target.value)} className={inputClass}>{["open", "triaged", "resolved", "dismissed"].map(value => <option key={value}>{value}</option>)}</select></label>}
      {items.length === 0 && <p>No submissions loaded. Use refresh to check status.</p>}
      {items.map(item => <article key={`${item.kind}:${item.id}`} className="space-y-2 break-words rounded-xl border border-white/20 p-4">
        <h3 className="font-semibold">{item.kind} · {item.status}</h3><p>Reference: {item.id}</p>{item.resource_ref && <p>Resource: {item.resource_ref}{item.target_ref ? ` → ${item.target_ref}` : ""}</p>}
        <p>{item.proposed_text ?? item.details}</p>
        {item.observed_at && <p>Observed {item.observed_at} ({item.observed_timezone}): {item.observed_hours}</p>}
        {item.source_url && <a className="underline" href={item.source_url} rel="noreferrer" target="_blank">Preserved source evidence</a>}
        {queue && item.verification_note && <p>Private verification record: {item.verification_note}</p>}
        {(item.resolution || item.decision_reason) && <p>Decision reason: {item.resolution ?? item.decision_reason}</p>}
        {item.kind === "report" && ["resolved", "dismissed"].includes(item.status) && !queue && <button className={buttonClass} onClick={() => { setType("appeal"); setParent(item.id); window.scrollTo({ top: 0, behavior: "auto" }) }}>Appeal this decision</button>}
        {queue && reviewer && <><label className="block">Review reason for {item.id}<textarea maxLength={1000} className={inputClass} value={notes[item.id] ?? ""} onChange={event => setNotes({ ...notes, [item.id]: event.target.value })} /></label>
          {item.kind === "correction" && item.status === "pending" && <p>For identity verification, record the independently sourced provider contact and verification method. Verification notes stay private; publication reasons are public.</p>}
          <div className="flex flex-wrap gap-2">{actions(item).map(action => <button key={action} disabled={loading} className={buttonClass} onClick={() => void decide(item, action)}>{action === "verify" ? "Confirm provider identity" : action}</button>)}</div></>}
      </article>)}
    </section>
    <p className="text-sm">Duplicate review uses reversible reference aliases; original references and source evidence remain inspectable. Undo removes the alias. Help and emergency guidance remain available without signing in.</p>
    <Link href="/emergency" className="inline-block underline">Open emergency guidance</Link>
  </main>
}

function actions(item: Item): string[] {
  if (item.kind === "report") return item.status === "open" ? ["triaged", "dismissed"] : item.status === "triaged" ? ["resolved", "dismissed", "open"] : item.status === "dismissed" ? ["open"] : []
  if (item.status === "published") return ["undo"]
  if (item.kind === "appeal") return item.status === "pending" ? ["uphold", "overturn"] : []
  if (item.status === "pending") return item.kind === "correction" ? ["verify", "reject"] : ["publish", "reject"]
  return item.status === "verified" ? ["publish", "reject"] : []
}
