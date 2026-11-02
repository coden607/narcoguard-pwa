"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { Button } from "@/components/ui/button"
import { useWakeLock } from "@/lib/hooks/use-wake-lock"
import { breathsCued, msUntilNextBreath } from "@/lib/rescue-breathing"

const noSubscribe = () => () => {}

/** Visual cue every 5 seconds, with optional vibration where the phone supports it. */
export function BreathingMetronome() {
  const [running, setRunning] = useState(false)
  const [vibrate, setVibrate] = useState(false)
  const [breaths, setBreaths] = useState(0)
  const [pulse, setPulse] = useState(false)
  const startedAt = useRef(0)
  // A ref, so switching vibration on or off mid-run doesn't restart the count.
  const vibrateRef = useRef(vibrate)
  useEffect(() => { vibrateRef.current = vibrate }, [vibrate])
  useWakeLock(running)
  // false on the server and first paint, so hydration matches; true after on phones that vibrate.
  const canVibrate = useSyncExternalStore(noSubscribe, () => typeof navigator.vibrate === "function", () => false)

  useEffect(() => {
    if (!running) return
    let timer: ReturnType<typeof setTimeout>
    const cue = () => {
      const elapsed = Date.now() - startedAt.current
      setBreaths(breathsCued(elapsed))
      setPulse(true)
      setTimeout(() => setPulse(false), 900)
      if (vibrateRef.current && canVibrate) navigator.vibrate(300)
      timer = setTimeout(cue, msUntilNextBreath(Date.now() - startedAt.current))
    }
    startedAt.current = Date.now()
    cue()
    return () => clearTimeout(timer)
  }, [running, canVibrate])

  return (
    <section aria-labelledby="metronome" className="space-y-4 rounded-xl border p-5 text-center" data-testid="breathing-metronome">
      <h2 id="metronome" className="text-xl font-semibold">Breath timer</h2>
      <div
        aria-hidden="true"
        className={`mx-auto flex h-40 w-40 items-center justify-center rounded-full border-4 text-2xl font-bold transition-all duration-300 motion-reduce:transition-none ${pulse ? "scale-110 border-primary bg-primary text-primary-foreground" : "border-primary/40"}`}
      >
        {running ? (pulse ? "Breathe" : "Wait") : "Ready"}
      </div>
      <p role="status" aria-live="polite" data-testid="breath-count">{running ? `Breaths given: ${breaths}` : "Press Start, then give one breath each time the circle fills."}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" size="lg" onClick={() => { setBreaths(0); setRunning((value) => !value) }}>{running ? "Stop" : "Start"}</Button>
        {canVibrate && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={vibrate} onChange={(event) => setVibrate(event.target.checked)} />
            Vibrate on each breath
          </label>
        )}
      </div>
    </section>
  )
}
