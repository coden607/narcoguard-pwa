import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync } from "node:fs"
import {
  addCompassEntry, addCompassOutcome, blankCompassLedger, openCompassLedger, sealCompassLedger,
  storeCompassEnvelope, readCompassEnvelope, COMPASS_VAULT_KEY,
} from "../packages/life-compass-core/src/vault"
import { safeResearchTerms, searchLifeCompassResearch } from "../packages/life-compass-core/src/research"

const entry = { situation: "Whether to apply for work", hypothesis: "I may complete two applications",
  indicator: "Number of completed applications", firstStep: "Draft one application", horizon: "30 days" as const }
const passphrase = "correct horse battery staple 2026"

test("opt-in encrypted vault never stores the plaintext decision", async () => {
  const ledger = addCompassEntry(blankCompassLedger(), entry, "2026-11-13T13:00:00Z", "test-entry")
  const sealed = await sealCompassLedger(ledger, passphrase)
  const raw = JSON.stringify(sealed)
  assert.equal(raw.includes("Whether to apply"), false)
  assert.equal(raw.includes(passphrase), false)
  const opened = await openCompassLedger(sealed, passphrase)
  assert.deepEqual(opened, ledger)
  await assert.rejects(() => openCompassLedger(sealed, "incorrect passphrase 123"), /Unable to decrypt/)
  const second = await sealCompassLedger(ledger, passphrase)
  assert.notEqual(second.salt, sealed.salt)
  assert.notEqual(second.iv, sealed.iv)
  const damaged = { ...sealed, ciphertext: sealed.ciphertext.slice(0,-8) + "AAAAAAAA" }
  await assert.rejects(() => openCompassLedger(damaged, passphrase))
})

test("vault storage accepts only encrypted envelope, reported outcomes are not marked as verified", async () => {
  const ledger = addCompassEntry(blankCompassLedger(), entry, "2026-11-13T13:00:00Z", "entry")
  const sealed = await sealCompassLedger(ledger, passphrase)
  const store = new Map<string,string>()
  const local = { getItem: (key: string) => store.get(key) || null, setItem: (key: string, value: string) => { store.set(key, value) } }
  storeCompassEnvelope(local, sealed)
  assert.equal(store.get(COMPASS_VAULT_KEY)?.includes(entry.situation), false)
  assert.deepEqual(await openCompassLedger(readCompassEnvelope(local), passphrase), ledger)
  assert.throws(() => storeCompassEnvelope(local, { entries: [entry] } as never), /Unencrypted/)
  const recorded = addCompassOutcome(ledger, "entry", "2026-12-13", "One application submitted")
  assert.equal(recorded.entries[0].outcomes[0].verification, "person-reported-unverified")
  assert.equal(recorded.entries[0].hypothesis, entry.hypothesis)
  assert.throws(() => addCompassEntry(blankCompassLedger(), { ...entry, indicator: "" }))
})

test("research fetches only actual PubMed bibliographic data; never computes personal efficacy", async () => {
  const calls: string[]=[]
  const fake = (async (url: URL | RequestInfo) => {
    calls.push(String(url))
    if (String(url).includes("esearch")) return new Response(JSON.stringify({ esearchresult: { idlist: ["123456", "bad-id"] } }), {status:200})
    return new Response(JSON.stringify({ result: { "123456": {
      title: "Systematic review of psychological flexibility", source: "Journal of Evidence", pubdate: "2026",
      articleids: [{idtype:"doi",value:"10.9999/example"}],
    }}}), {status:200})
  }) as typeof fetch
  assert.equal(safeResearchTerms("This text contains\na private narrative"), false)
  const result = await searchLifeCompassResearch("psychological flexibility review", {fetcher: fake})
  assert.equal(calls.length, 2)
  assert.equal(calls.every(url => new URL(url).hostname === "eutils.ncbi.nlm.nih.gov"), true)
  assert.equal(result.articles.length, 1)
  assert.equal(result.articles[0].url, "https://pubmed.ncbi.nlm.nih.gov/123456/")
  assert.equal(result.articles[0].studyQuality, "not-assessed")
  assert.equal("personalProbability" in result, false)
  assert.match(result.evidenceLimit, /No individual risk/)
})

test("Life Compass page explicitly shows research and vault; chat remains opt-in", () => {
  const page = readFileSync("app/angel/life-compass/page.tsx","utf8")
  const evidence = readFileSync("components/ai/life-compass-evidence.tsx","utf8")
  const journal = readFileSync("components/ai/life-compass-journal.tsx","utf8")
  assert.match(page,/LifeCompassEvidence/)
  assert.match(page,/LifeCompassJournal/)
  assert.match(page,/AngelAI mode="life-compass"/)
  assert.match(evidence,/Search PubMed/)
  assert.match(evidence,/never sent to PubMed/)
  assert.match(journal,/No automatic saving/)
  assert.match(journal,/localStorage/)
  assert.doesNotMatch(journal,/fetch\(/)
})
