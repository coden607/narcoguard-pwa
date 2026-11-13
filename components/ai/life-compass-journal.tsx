"use client"

import { useState } from "react"
import type { ChangeEvent } from "react"
import {
  COMPASS_VAULT_KEY, addCompassEntry, addCompassOutcome, blankCompassLedger,
  openCompassLedger, readCompassEnvelope, sealCompassLedger, storeCompassEnvelope,
  type CompassLedger, type Horizon, type SealedCompassLedger,
} from "@/packages/life-compass-core/src/vault"

/** A private on-device feature. Never automatically copies Angel chat or health data. */
export function LifeCompassJournal() {
  const [situation, setSituation] = useState("")
  const [firstStep, setFirstStep] = useState("")
  const [hypothesis, setHypothesis] = useState("")
  const [indicator, setIndicator] = useState("")
  const [horizon, setHorizon] = useState<Horizon>("30 days")
  const [passphrase, setPassphrase] = useState("")
  const [ledger, setLedger] = useState<CompassLedger | null>(null)
  const [selectedId, setSelectedId] = useState("")
  const [outcome, setOutcome] = useState("")
  const [outcomeDate, setOutcomeDate] = useState("")
  const [status, setStatus] = useState("No data is saved automatically.")
  const [expanded, setExpanded] = useState(false)

  async function unlockWith(pass: string): Promise<CompassLedger> {
    const envelope = readCompassEnvelope(window.localStorage)
    return envelope === null ? blankCompassLedger() : openCompassLedger(envelope, pass)
  }
  async function write(makeNext: (old: CompassLedger) => CompassLedger, message: string) {
    try {
      const old = await unlockWith(passphrase)
      const next = makeNext(old)
      const sealed = await sealCompassLedger(next, passphrase)
      storeCompassEnvelope(window.localStorage, sealed)
      setLedger(next)
      setSelectedId(next.entries.at(-1)?.id || "")
      setStatus(message)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Encryption or storage failed.")
    } finally { setPassphrase("") }
  }
  async function unlock() {
    try {
      const opened = await unlockWith(passphrase)
      setLedger(opened)
      setSelectedId(opened.entries.at(-1)?.id || "")
      setStatus(String(opened.entries.length) + " decision(s) unlocked. None were sent to a server.")
    } catch { setLedger(null); setStatus("Unable to unlock: wrong passphrase or damaged history.") }
    finally { setPassphrase("") }
  }
  function exportEncrypted() {
    const saved = window.localStorage.getItem(COMPASS_VAULT_KEY)
    if (!saved) { setStatus("Nothing saved to export."); return }
    const blob = new Blob([saved], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "life-compass-encrypted-backup.json"
    document.body.append(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setStatus("Encrypted backup exported. Keep the passphrase separately.")
  }
  async function importEncrypted(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    const pass = passphrase
    try {
      if (!file || file.size > 1_300_000) throw Error("Choose a backup smaller than 1.3 MB.")
      const envelope: unknown = JSON.parse(await file.text())
      const opened = await openCompassLedger(envelope, pass)
      if (!window.confirm("Replace the local Life Compass vault with this validated backup?")) return
      storeCompassEnvelope(window.localStorage, envelope as SealedCompassLedger)
      setLedger(opened)
      setSelectedId(opened.entries.at(-1)?.id || "")
      setStatus("Encrypted backup restored. No information was uploaded.")
    } catch { setStatus("Restore failed. Existing encrypted history was left unchanged.") }
    finally { event.target.value = ""; setPassphrase("") }
  }
  function erase() {
    if (!window.confirm("Permanently erase this device's Life Compass encrypted history?")) return
    window.localStorage.removeItem(COMPASS_VAULT_KEY)
    setLedger(null)
    setSelectedId("")
    setStatus("Encrypted history erased from this browser.")
  }
  const selected = ledger?.entries.find(entry => entry.id === selectedId)
  return (
    <section className="rounded-xl border p-4" data-testid="life-compass-vault">
      <button className="w-full text-left text-lg font-semibold" type="button"
        aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        Encrypted decision journal {expanded ? "−" : "+"}
      </button>
      {!expanded ? <p className="mt-1 text-sm text-muted-foreground">Optional, private journal. No automatic saving.</p> : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            Only explicitly entered notes are encrypted and saved in this browser. Angel conversations are not copied.
            Passphrases never leave the device or remain in storage. If lost, your history cannot be recovered.
            This is not a medical record or clinical assessment.
          </p>
          <label className="block text-sm" htmlFor="compass-situation">Decision or situation
            <textarea id="compass-situation" className="mt-1 w-full rounded border bg-background p-2" maxLength={500} rows={2}
              value={situation} onChange={e => setSituation(e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="compass-first-step">Small next action (you choose)
            <input id="compass-first-step" className="mt-1 w-full rounded border bg-background p-2" maxLength={250}
              value={firstStep} onChange={e => setFirstStep(e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="compass-hypothesis">Possible result (your hypothesis, not a prediction from AI)
            <textarea id="compass-hypothesis" className="mt-1 w-full rounded border bg-background p-2" maxLength={500} rows={2}
              value={hypothesis} onChange={e => setHypothesis(e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="compass-indicator">What observation would test it?
            <input id="compass-indicator" className="mt-1 w-full rounded border bg-background p-2" maxLength={500}
              value={indicator} onChange={e => setIndicator(e.target.value)} />
          </label>
          <label className="block text-sm" htmlFor="compass-horizon">Review interval
            <select id="compass-horizon" className="mt-1 w-full rounded border bg-background p-2" value={horizon}
              onChange={e => setHorizon(e.target.value as Horizon)}>
              <option>24 hours</option><option>30 days</option><option>90 days</option><option>1 year</option>
            </select>
          </label>
          <label className="block text-sm" htmlFor="compass-pass">Vault passphrase (12 characters minimum)
            <input id="compass-pass" type="password" autoComplete="off" minLength={12} maxLength={1024}
              className="mt-1 w-full rounded border bg-background p-2" value={passphrase} onChange={e => setPassphrase(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => void write(
              old => addCompassEntry(old, { situation, hypothesis, indicator, firstStep, horizon }),
              "Decision encrypted and saved only to this browser.")}>Encrypt and save entry</button>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={() => void unlock()}>Unlock saved history</button>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={exportEncrypted}>Download encrypted backup</button>
            <button type="button" className="rounded border px-3 py-2 text-sm" onClick={erase}>Erase saved history</button>
          </div>
          <label className="block text-sm" htmlFor="compass-import">Restore an encrypted backup (requires passphrase and confirmation)
            <input id="compass-import" type="file" accept=".json,application/json" className="mt-1 block w-full"
              onChange={event => void importEncrypted(event)} />
          </label>
          <p role="status" className="text-sm text-muted-foreground" aria-live="polite">{status}</p>
          {ledger && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm">Saved entries: {ledger.entries.length}. Every forecast is an uncalibrated, user-written hypothesis.</p>
              <label className="block text-sm" htmlFor="compass-entry-choice">Decision for outcome
                <select id="compass-entry-choice" className="mt-1 w-full rounded border bg-background p-2" value={selectedId}
                  onChange={e => setSelectedId(e.target.value)}>
                  {ledger.entries.map(entry => <option key={entry.id} value={entry.id}>{entry.situation.slice(0, 90)}</option>)}
                </select>
              </label>
              {selected && (
                <div className="rounded border p-3 text-sm">
                  <p>Hypothesis: {selected.hypothesis}</p>
                  <p>Test: {selected.indicator} · Horizon: {selected.horizon}</p>
                  <p>Reported outcomes: {selected.outcomes.length}. These observations are not independently verified.</p>
                  {selected.outcomes.map((row, index) => <p key={index}>{row.observedAt}: {row.observation}</p>)}
                </div>
              )}
              <label className="block text-sm" htmlFor="compass-outcome-date">Date of observed result
                <input id="compass-outcome-date" type="date" value={outcomeDate}
                  className="mt-1 w-full rounded border bg-background p-2" onChange={e => setOutcomeDate(e.target.value)} />
              </label>
              <label className="block text-sm" htmlFor="compass-outcome">What actually happened?
                <textarea id="compass-outcome" rows={2} maxLength={500} value={outcome}
                  className="mt-1 w-full rounded border bg-background p-2" onChange={e => setOutcome(e.target.value)} />
              </label>
              <button type="button" className="rounded border px-3 py-2 text-sm" disabled={!selected}
                onClick={() => void write(old => addCompassOutcome(old, selectedId, outcomeDate, outcome),
                  "Observed outcome encrypted and saved; it remains person-reported and unverified.")}>
                Encrypt and record outcome
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
