"use client"

import { useState } from "react"
import type { FormEvent } from "react"
import type { LifeCompassPaper } from "@/packages/life-compass-core/src/research"

export function LifeCompassEvidence() {
  const [query, setQuery] = useState("")
  const [articles, setArticles] = useState<LifeCompassPaper[]>([])
  const [status, setStatus] = useState("No research searched.")
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    if (query.trim().length < 3 || query.length > 140 || /[\r\n<>]/.test(query)) {
      setStatus("Enter 3–140 characters of general research terms, not private details.")
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10_000)
    setBusy(true)
    setArticles([])
    setStatus("Retrieving PubMed citation metadata. Your Angel conversation is not included.")
    try {
      const response = await fetch("/api/angel/literature?q=" + encodeURIComponent(query.trim()), { signal: controller.signal, cache: "no-store" })
      const result = await response.json() as { articles?: LifeCompassPaper[]; error?: string }
      if (!response.ok || !Array.isArray(result.articles)) throw Error(result.error || "Research search unavailable")
      setArticles(result.articles)
      setStatus(String(result.articles.length) + " PubMed record(s) found. These are bibliographic matches, not validated personal recommendations.")
    } catch {
      setStatus("No sources verified. PubMed is unavailable or the request failed; try another time.")
    } finally { clearTimeout(timer); setBusy(false) }
  }
  return (
    <section className="space-y-3 rounded-xl border p-4" data-testid="life-compass-evidence">
      <h2 className="text-lg font-semibold">Research citations (optional)</h2>
      <p className="text-sm text-muted-foreground">
        Search public psychological literature by general keywords. Your search terms go to NCBI PubMed only when you press Search;
        do not enter names, detailed experiences, addresses, or protected health information. Angel chat and journal records are never sent to PubMed.
        Publication metadata cannot establish that a study applies to you.
      </p>
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <label className="flex-1 text-sm" htmlFor="compass-research-query">
          Research terms
          <input id="compass-research-query" className="mt-1 w-full rounded-md border bg-background p-2" value={query}
            onChange={event => setQuery(event.target.value)} maxLength={140} autoComplete="off"
            placeholder="CBT rumination systematic review" />
        </label>
        <button type="submit" disabled={busy} className="rounded-lg border px-4 py-2 text-sm font-semibold">
          {busy ? "Searching…" : "Search PubMed"}
        </button>
      </form>
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">{status}</p>
      <ul className="space-y-2 text-sm" aria-label="Verified PubMed records">
        {articles.map(paper => (
          <li key={paper.pmid} className="rounded-md border p-3">
            <a href={paper.url} target="_blank" rel="noopener noreferrer" className="underline" >
              {paper.title}
            </a>
            <p className="text-xs text-muted-foreground">
              {paper.journal} · {paper.published} · PubMed {paper.pmid} · Study quality not assessed.
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}
