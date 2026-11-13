/**
 * Required Notice: Copyright 2026 Stephen Blanford.
 * SPDX-License-Identifier: LicenseRef-PolyForm-Noncommercial-1.0.0
 * Evidence search: PubMed bibliographic metadata, not clinical conclusions.
 */
export type LifeCompassPaper = {
  pmid: string; title: string; journal: string; published: string; doi: string | null;
  url: string; provenance: "NCBI PubMed metadata"; studyQuality: "not-assessed"
}
export type LifeCompassResearch = {
  source: "NCBI PubMed"; retrievedAt: string; articles: LifeCompassPaper[];
  evidenceLimit: string
}
const ROOT = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
const PMID = /^\d{1,12}$/
export const safeResearchTerms = (query: unknown): query is string =>
  typeof query === "string" && query.trim().length >= 3 && query.length <= 140 && !/[\r\n\u0000-\u001f<>]/.test(query)
async function json(url: URL, fetcher: typeof fetch, signal?: AbortSignal): Promise<any> {
  const response = await fetcher(url, { headers: { Accept: "application/json" }, signal, cache: "no-store" })
  if (!response.ok) throw Error("PubMed request failed (" + response.status + ")")
  return response.json()
}
export async function searchLifeCompassResearch(terms: string,
  options: { fetcher?: typeof fetch; signal?: AbortSignal } = {}): Promise<LifeCompassResearch> {
  if (!safeResearchTerms(terms)) throw Error("Enter 3–140 characters of general research terms")
  const fetcher = options.fetcher || fetch
  const esearch = new URL(ROOT + "esearch.fcgi")
  esearch.searchParams.set("db", "pubmed")
  esearch.searchParams.set("term", terms.trim())
  esearch.searchParams.set("retmax", "5")
  esearch.searchParams.set("retmode", "json")
  const identifiers = await json(esearch, fetcher, options.signal)
  const ids = (Array.isArray(identifiers?.esearchresult?.idlist) ? identifiers.esearchresult.idlist : [])
    .filter((v: unknown): v is string => typeof v === "string" && PMID.test(v)).slice(0, 5)
  const result: LifeCompassResearch = { source: "NCBI PubMed", retrievedAt: new Date().toISOString(), articles: [],
    evidenceLimit: "Metadata only; verify study quality, contrary evidence and applicability independently. No individual risk or diagnosis is inferred." }
  if (!ids.length) return result
  const esummary = new URL(ROOT + "esummary.fcgi")
  esummary.searchParams.set("db", "pubmed")
  esummary.searchParams.set("id", ids.join(","))
  esummary.searchParams.set("retmode", "json")
  const records = await json(esummary, fetcher, options.signal)
  result.articles = ids.flatMap((id: string) => {
    const item = records?.result?.[id]
    if (typeof item?.title !== "string" || !item.title.trim()) return []
    const doi = Array.isArray(item.articleids) ?
      item.articleids.find((x: any) => x?.idtype === "doi" && /^10\.\d{4,9}\//.test(String(x.value)))?.value ?? null : null
    return [{ pmid: id, title: item.title.trim().slice(0, 500),
      journal: String(item.fulljournalname || item.source || "").slice(0, 200),
      published: String(item.pubdate || "").slice(0, 60),
      doi, url: "https://pubmed.ncbi.nlm.nih.gov/" + id + "/",
      provenance: "NCBI PubMed metadata" as const, studyQuality: "not-assessed" as const }]
  })
  return result
}
