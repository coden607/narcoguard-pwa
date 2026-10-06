"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Award, BookOpen, Heart, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CertificationTest, HERO_CERTIFICATE_KEY } from "@/components/hero/certification-test"
import { useLocalDate } from "@/lib/hooks/use-guardian-state"

type HeroState = {
  test_version: number
  passed_at: string
  expires_at: string
  enrolled: boolean
  naloxone_ready: boolean
  naloxone_expires_on: string | null
  on_call: boolean
  on_call_since: string | null
}

type Status = { enrollment: boolean; certification: boolean; nearbyRequests: boolean; hero?: HeroState | null }

const noSubscription = () => () => undefined
const storedCertificate = () => {
  try {
    return localStorage.getItem(HERO_CERTIFICATE_KEY)
  } catch {
    return null
  }
}

export default function HeroSignup() {
  const router = useRouter()
  const saved = useSyncExternalStore(noSubscription, storedCertificate, () => null)
  const [fresh, setFresh] = useState<string | null>(null)
  const certificate = fresh ?? saved
  const [status, setStatus] = useState<Status | null>(null)
  const [note, setNote] = useState<string>()
  const [busy, setBusy] = useState(false)
  const today = useLocalDate()
  const [naloxoneReady, setNaloxoneReady] = useState(false)
  const [naloxoneExpiresOn, setNaloxoneExpiresOn] = useState("")

  const load = async () => {
    const response = await fetch("/api/heroes", { cache: "no-store" })
    const body = (await response.json()) as Status
    setStatus(body)
    setNaloxoneReady(Boolean(body.hero?.naloxone_ready))
    setNaloxoneExpiresOn(body.hero?.naloxone_expires_on ?? "")
  }

  useEffect(() => {
    let cancelled = false
    fetch("/api/heroes", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: Status) => {
        if (cancelled) return
        setStatus(body)
        setNaloxoneReady(Boolean(body.hero?.naloxone_ready))
        setNaloxoneExpiresOn(body.hero?.naloxone_expires_on ?? "")
      })
      .catch(() => { if (!cancelled) setStatus({ enrollment: false, certification: false, nearbyRequests: false, hero: null }) })
    return () => { cancelled = true }
  }, [])

  const enroll = async () => {
    setBusy(true)
    setNote(undefined)
    try {
      const response = await fetch("/api/heroes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ certificate }) })
      const body = (await response.json()) as { enrolled?: boolean; error?: string }
      if (response.status === 401) setNote("Sign in first, then come back to enroll.")
      else if (body.enrolled) {
        setNote("You are enrolled in the Hero Network.")
        await load()
      } else setNote(body.error ?? "Enrollment failed.")
    } catch {
      setNote("Could not reach NarcoGuard. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  const updateReadiness = async (onCall: boolean) => {
    setBusy(true)
    setNote(undefined)
    try {
      const response = await fetch("/api/heroes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naloxoneReady, naloxoneExpiresOn, onCall }),
      })
      const body = (await response.json()) as { hero?: HeroState; error?: string }
      if (!response.ok || !body.hero) {
        setNote(body.error ?? "Could not update Hero readiness.")
        return
      }
      setStatus((current) => current ? { ...current, hero: body.hero } : current)
      setNaloxoneReady(body.hero.naloxone_ready)
      setNaloxoneExpiresOn(body.hero.naloxone_expires_on ?? "")
      setNote(body.hero.on_call ? "You are On Call. Keep naloxone physically with you and leave On Call if that changes." : "You are Off Call.")
    } catch {
      setNote("Could not reach NarcoGuard. Check your connection.")
    } finally {
      setBusy(false)
    }
  }

  const hero = status?.hero ?? null
  const certCurrent = Boolean(hero && hero.expires_at.slice(0, 10) >= today)
  const naloxoneCurrent = Boolean(naloxoneReady && naloxoneExpiresOn && naloxoneExpiresOn >= today)
  const readyForCall = Boolean(hero?.enrolled && certCurrent && naloxoneCurrent)

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Shield className="w-20 h-20 mx-auto text-primary pulse-glow" aria-hidden="true" />
          <h1 className="text-4xl font-bold glow-text">Become a Hero</h1>
          <p className="text-lg text-muted-foreground">A real opt-in readiness network: pass the Hero test, enroll, and carry unexpired naloxone whenever you mark yourself On Call.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <HolographicCard className="p-6 text-center">
            <Heart className="w-12 h-12 mx-auto mb-4 text-red-500" aria-hidden="true" />
            <h2 className="font-bold mb-2">1. Learn the steps</h2>
            <p className="text-sm text-muted-foreground">Recognize an overdose, give naloxone, support breathing, protect scene safety.</p>
          </HolographicCard>
          <HolographicCard className="p-6 text-center">
            <Award className="w-12 h-12 mx-auto mb-4 text-yellow-500" aria-hidden="true" />
            <h2 className="font-bold mb-2">2. Pass at 100%</h2>
            <p className="text-sm text-muted-foreground">A random 12-question test. Every answer must be correct before certification.</p>
          </HolographicCard>
          <HolographicCard className="p-6 text-center">
            <Shield className="w-12 h-12 mx-auto mb-4 text-blue-500" aria-hidden="true" />
            <h2 className="font-bold mb-2">3. Carry naloxone On Call</h2>
            <p className="text-sm text-muted-foreground">The system will not allow On Call unless certification and naloxone readiness are current.</p>
          </HolographicCard>
        </div>

        <HolographicCard className="p-6 sm:p-8">
          <CertificationTest onCertified={setFresh} />
        </HolographicCard>

        <HolographicCard className="p-6 sm:p-8">
          <section className="space-y-4" data-testid="hero-enroll">
            <h2 className="text-xl font-bold">Hero enrollment & readiness</h2>
            {!certificate && !hero ? (
              <p className="text-sm text-muted-foreground">Pass the test first. Enrollment requires a certificate from a perfect score.</p>
            ) : status && !status.enrollment ? (
              <p className="text-sm text-muted-foreground">Certification is available, but account enrollment is not configured on this deployment.</p>
            ) : !hero?.enrolled ? (
              <Button type="button" onClick={enroll} disabled={busy || !status || !certificate}>{busy ? "Enrolling…" : "Enroll with my certificate"}</Button>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 text-sm space-y-1">
                  <p><strong>Certification:</strong> {certCurrent ? "Current" : "Expired"}</p>
                  <p><strong>On-call state:</strong> {hero.on_call ? "ON CALL" : "Off Call"}</p>
                  {hero.on_call_since && <p className="text-muted-foreground">On Call since {new Date(hero.on_call_since).toLocaleString()}</p>}
                </div>

                <label className="flex items-start gap-3 rounded-lg border p-4">
                  <input type="checkbox" className="mt-1" checked={naloxoneReady} onChange={(event) => setNaloxoneReady(event.target.checked)} />
                  <span className="text-sm">
                    <strong>I physically have naloxone with me while On Call.</strong>
                    <span className="block text-muted-foreground">If you no longer have it, go Off Call immediately. This is a self-attestation, not pharmacy or medical verification.</span>
                  </span>
                </label>

                <div className="space-y-2">
                  <label htmlFor="naloxone-expiry" className="text-sm font-medium">Naloxone expiration date</label>
                  <Input id="naloxone-expiry" type="date" value={naloxoneExpiresOn} onChange={(event) => setNaloxoneExpiresOn(event.target.value)} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" disabled={busy} onClick={() => void updateReadiness(false)}>Save & stay Off Call</Button>
                  {hero.on_call ? (
                    <Button type="button" variant="destructive" disabled={busy} onClick={() => void updateReadiness(false)}>Go Off Call now</Button>
                  ) : (
                    <Button type="button" disabled={busy || !readyForCall} onClick={() => void updateReadiness(true)}>Go On Call</Button>
                  )}
                </div>
                {!readyForCall && !hero.on_call && <p className="text-xs text-muted-foreground">To go On Call: current Hero certificate + enrollment + naloxone physically with you + a current expiration date.</p>}
              </div>
            )}

            {note && <p className="text-sm" role="status">{note} {note.startsWith("Sign in") && <Link href="/auth" className="underline text-primary">Sign in</Link>}</p>}
            <p className="text-sm text-muted-foreground">
              On Call means ready to receive future NarcoGuard volunteer requests; it does not make you EMS, authorize unsafe entry, or replace 911. Live nearby emergency matching remains off until its separate privacy/safety review is complete.
            </p>
          </section>
        </HolographicCard>

        <HolographicCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="w-6 h-6" aria-hidden="true" />
            Study before the test
          </h2>
          <ul className="list-disc pl-6 space-y-2 text-sm text-muted-foreground">
            <li>Signs of an opioid overdose and how to check breathing</li>
            <li>Giving nasal naloxone, and when to give another dose</li>
            <li>Rescue breathing, CPR and the recovery position</li>
            <li>Scene safety, privacy, EMS handoff, and staying with the person</li>
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">Hands-on naloxone and CPR training is strongly recommended in addition to the NarcoGuard test.</p>
          <GlowButton onClick={() => router.push("/ar")} variant="outline" className="w-full mt-4">
            Open Training Modules
          </GlowButton>
        </HolographicCard>
      </div>
    </div>
  )
}
