"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useWakeLock } from "@/lib/hooks/use-wake-lock"
import { CHECK_DURATIONS_MIN, DEFAULT_DURATION_MIN, NEVER_USE_ALONE, endsAtFor, formatRemaining, phaseAt, remainingMs } from "@/lib/check-on-me"

type AudioCtor = typeof AudioContext

/** A loud two-tone siren from WebAudio. Needs the AudioContext created from a tap (Start). */
function startSiren(context: AudioContext): () => void {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = "square"
  gain.gain.value = 0.9
  oscillator.connect(gain).connect(context.destination)
  const now = context.currentTime
  for (let i = 0; i < 600; i++) oscillator.frequency.setValueAtTime(i % 2 ? 660 : 960, now + i * 0.5)
  oscillator.start()
  return () => { try { oscillator.stop() } catch { /* already stopped */ } oscillator.disconnect() }
}

export function CheckOnMeTimer() {
  const [minutes, setMinutes] = useState<number>(DEFAULT_DURATION_MIN)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const audioRef = useRef<AudioContext | null>(null)
  const stopSirenRef = useRef<(() => void) | null>(null)
  const phase = phaseAt(endsAt, now)
  const wakeLocked = useWakeLock(endsAt !== null)

  useEffect(() => {
    if (endsAt === null) return
    const tick = () => setNow(Date.now())
    tick()
    const id = window.setInterval(tick, 500)
    document.addEventListener("visibilitychange", tick)
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", tick) }
  }, [endsAt])

  useEffect(() => {
    if (phase !== "alarm") return
    if (audioRef.current && !stopSirenRef.current) {
      void audioRef.current.resume()
      stopSirenRef.current = startSiren(audioRef.current)
    }
    const buzz = () => { if ("vibrate" in navigator) navigator.vibrate([800, 300, 800, 300, 800]) }
    buzz()
    const id = window.setInterval(buzz, 3000)
    return () => window.clearInterval(id)
  }, [phase])

  const stopAlarm = useCallback(() => {
    stopSirenRef.current?.()
    stopSirenRef.current = null
    if ("vibrate" in navigator) navigator.vibrate(0)
  }, [])

  useEffect(() => () => { stopAlarm(); void audioRef.current?.close() }, [stopAlarm])

  const start = () => {
    const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext)
    if (Ctor && !audioRef.current) audioRef.current = new Ctor()
    void audioRef.current?.resume()
    const startMs = Date.now()
    setNow(startMs)
    setEndsAt(endsAtFor(startMs, minutes))
  }
  const imOkay = () => { stopAlarm(); const startMs = Date.now(); setNow(startMs); setEndsAt(endsAtFor(startMs, minutes)) }
  const cancel = () => { stopAlarm(); setEndsAt(null) }

  if (phase === "alarm") {
    return (
      <section role="alertdialog" aria-labelledby="alarm-title" className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 overflow-y-auto bg-red-700 p-6 text-center text-white" data-testid="check-on-me-alarm">
        <h2 id="alarm-title" className="text-4xl font-black">This person may be overdosing</h2>
        <p className="max-w-md text-lg">They set this alarm and didn&apos;t answer it. Call 911, then follow the steps.</p>
        <a href="tel:911" className="w-full max-w-sm rounded-2xl bg-white px-6 py-5 text-2xl font-black text-red-700">Call 911</a>
        <Link href="/ar" className="w-full max-w-sm rounded-2xl border-2 border-white px-6 py-4 text-xl font-bold">Give naloxone: step by step</Link>
        <Button type="button" variant="outline" className="min-h-12 border-white bg-transparent text-white" onClick={imOkay}>I&apos;m okay, restart the timer</Button>
        <button type="button" className="min-h-11 underline" onClick={cancel}>Stop the alarm</button>
      </section>
    )
  }

  if (endsAt !== null) {
    return (
      <div className={`space-y-4 rounded-2xl border-2 p-6 text-center ${phase === "warning" ? "border-amber-400" : "border-primary/50"}`} data-testid="check-on-me-running">
        <p className="text-6xl font-black tabular-nums" aria-live="off">{formatRemaining(remainingMs(endsAt, now))}</p>
        <p role="status">{phase === "warning" ? "Less than a minute. Tap I'm okay or the alarm will sound." : "Tap I'm okay before the time runs out."}</p>
        <Button type="button" className="min-h-14 w-full text-xl" onClick={imOkay}>I&apos;m okay</Button>
        <button type="button" className="min-h-11 text-sm underline" onClick={cancel}>Cancel timer</button>
        <p className="text-xs text-muted-foreground">{wakeLocked ? "Screen will stay on." : "Keep this screen open and the phone unlocked, with the volume up."}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border p-6">
      <fieldset className="space-y-2">
        <legend className="font-semibold">Check on me in</legend>
        <div className="flex flex-wrap gap-2">
          {CHECK_DURATIONS_MIN.map((option) => (
            <button key={option} type="button" aria-pressed={minutes === option} onClick={() => setMinutes(option)}
              className={`min-h-11 rounded-lg border px-4 ${minutes === option ? "border-primary bg-primary text-primary-foreground" : "hover:bg-primary/10"}`}>
              {option} min
            </button>
          ))}
        </div>
      </fieldset>
      <Button type="button" className="min-h-14 w-full text-xl" onClick={start}>Start timer</Button>
      <p className="text-sm text-muted-foreground">If you don&apos;t tap &quot;I&apos;m okay&quot; in time, this phone plays a loud alarm and shows anyone nearby what to do. It doesn&apos;t call or message anyone.</p>
      <p className="text-sm">Want a real person to check on you? Call <a className="text-primary underline" href={`tel:${NEVER_USE_ALONE.tel}`}>{NEVER_USE_ALONE.name}, {NEVER_USE_ALONE.display}</a>. They stay on the line and send help if you stop responding.</p>
    </div>
  )
}
