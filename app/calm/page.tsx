"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Headphones, Pause, Play, RotateCcw, Volume2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  BINAURAL_PRESETS,
  SOUNDSCAPE_PRESETS,
  binauralFrequencies,
  clampWellnessVolume,
  sessionSeconds,
  type BinauralPreset,
  type SoundscapePreset,
} from "@/lib/wellness-audio"

type AudioSession = {
  context: AudioContext
  master: GainNode
  stops: Array<() => void>
}

function makeBrownNoise(context: AudioContext) {
  const seconds = 4
  const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate)
  const data = buffer.getChannelData(0)
  let last = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    last = (last + 0.02 * white) / 1.02
    data[i] = last * 3.2
  }
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function connectBinaural(context: AudioContext, destination: AudioNode, preset: BinauralPreset, stops: Array<() => void>) {
  const { leftHz, rightHz } = binauralFrequencies(preset)
  const merger = context.createChannelMerger(2)
  const left = context.createOscillator()
  const right = context.createOscillator()
  const leftGain = context.createGain()
  const rightGain = context.createGain()

  left.type = "sine"
  right.type = "sine"
  left.frequency.value = leftHz
  right.frequency.value = rightHz
  leftGain.gain.value = 0.16
  rightGain.gain.value = 0.16

  left.connect(leftGain).connect(merger, 0, 0)
  right.connect(rightGain).connect(merger, 0, 1)
  merger.connect(destination)
  left.start()
  right.start()
  stops.push(() => { try { left.stop() } catch {} })
  stops.push(() => { try { right.stop() } catch {} })
}

function connectSoundscape(context: AudioContext, destination: AudioNode, preset: SoundscapePreset, stops: Array<() => void>) {
  const soundGain = context.createGain()
  soundGain.gain.value = 0.32
  soundGain.connect(destination)

  if (preset.id === "deep-drone") {
    const frequencies = [55, 82.5, 110]
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = index === 0 ? "sine" : "triangle"
      oscillator.frequency.value = frequency
      gain.gain.value = index === 0 ? 0.2 : 0.07
      oscillator.connect(gain).connect(soundGain)
      oscillator.start()
      stops.push(() => { try { oscillator.stop() } catch {} })
    })
    return
  }

  const noise = makeBrownNoise(context)
  const filter = context.createBiquadFilter()
  filter.type = "lowpass"
  filter.frequency.value = preset.id === "ocean" ? 720 : 520
  noise.connect(filter).connect(soundGain)

  if (preset.id === "ocean") {
    const lfo = context.createOscillator()
    const lfoGain = context.createGain()
    lfo.type = "sine"
    lfo.frequency.value = 0.08
    lfoGain.gain.value = 0.16
    lfo.connect(lfoGain).connect(soundGain.gain)
    lfo.start()
    stops.push(() => { try { lfo.stop() } catch {} })
  }

  noise.start()
  stops.push(() => { try { noise.stop() } catch {} })
}

export default function CalmPage() {
  const [binauralId, setBinauralId] = useState<BinauralPreset["id"]>("theta")
  const [soundscapeId, setSoundscapeId] = useState<SoundscapePreset["id"]>("deep-drone")
  const [useBinaural, setUseBinaural] = useState(true)
  const [useSoundscape, setUseSoundscape] = useState(true)
  const [volume, setVolume] = useState(0.18)
  const [durationMinutes, setDurationMinutes] = useState(15)
  const [remaining, setRemaining] = useState(0)
  const [playing, setPlaying] = useState(false)
  const sessionRef = useRef<AudioSession | null>(null)
  const timerRef = useRef<number | null>(null)

  const stop = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
    const session = sessionRef.current
    sessionRef.current = null
    if (session) {
      const now = session.context.currentTime
      session.master.gain.cancelScheduledValues(now)
      session.master.gain.setValueAtTime(session.master.gain.value, now)
      session.master.gain.linearRampToValueAtTime(0, now + 0.25)
      window.setTimeout(() => {
        session.stops.forEach((fn) => fn())
        void session.context.close()
      }, 300)
    }
    setPlaying(false)
    setRemaining(0)
  }

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    const session = sessionRef.current
    session?.stops.forEach((fn) => fn())
    void session?.context.close()
  }, [])

  const start = async () => {
    stop()
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) return

    const context = new AudioContextClass()
    await context.resume()
    const master = context.createGain()
    const safeVolume = clampWellnessVolume(volume)
    master.gain.setValueAtTime(0, context.currentTime)
    master.gain.linearRampToValueAtTime(safeVolume, context.currentTime + 1.2)
    master.connect(context.destination)

    const stops: Array<() => void> = []
    if (useBinaural) {
      const preset = BINAURAL_PRESETS.find((item) => item.id === binauralId)!
      connectBinaural(context, master, preset, stops)
    }
    if (useSoundscape) {
      const preset = SOUNDSCAPE_PRESETS.find((item) => item.id === soundscapeId)!
      connectSoundscape(context, master, preset, stops)
    }

    sessionRef.current = { context, master, stops }
    const total = sessionSeconds(durationMinutes)
    setRemaining(total)
    setPlaying(true)
    timerRef.current = window.setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          window.setTimeout(stop, 0)
          return 0
        }
        return value - 1
      })
    }, 1000)
  }

  const updateVolume = (next: number) => {
    const safe = clampWellnessVolume(next)
    setVolume(safe)
    const session = sessionRef.current
    if (session) {
      const now = session.context.currentTime
      session.master.gain.cancelScheduledValues(now)
      session.master.gain.linearRampToValueAtTime(safe, now + 0.08)
    }
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-7">
      <nav><Link href="/" className="underline text-primary">← NarcoGuard dashboard</Link></nav>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Headphones className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Calm Audio</h1>
        </div>
        <p className="text-muted-foreground">
          Local, generated binaural tones and meditation soundscapes. Audio is created on this device and does not require a streaming service.
        </p>
      </header>

      <section className="rounded-xl border border-primary/30 p-5 space-y-3">
        <h2 className="text-xl font-semibold">Before you start</h2>
        <p className="text-sm">
          Binaural tones require stereo headphones to create the left/right frequency difference. Keep volume comfortable.
          Do not use this feature while driving or when you need to stay alert.
        </p>
        <p className="text-xs text-muted-foreground">
          These sounds are optional wellness tools, not medical treatment, diagnosis, detoxification, or a substitute for emergency or professional care.
          NarcoGuard does not claim that a particular frequency changes brain activity or treats a condition.
        </p>
      </section>

      <section className="rounded-xl border p-5 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Binaural layer</h2>
            <p className="text-sm text-muted-foreground">A quiet tone in each ear with a small frequency difference.</p>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useBinaural} onChange={(e) => setUseBinaural(e.target.checked)} disabled={playing} />
            Enabled
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {BINAURAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={playing || !useBinaural}
              onClick={() => setBinauralId(preset.id)}
              className={`text-left rounded-lg border p-4 transition ${binauralId === preset.id ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <strong>{preset.label}</strong>
              <span className="block text-xs text-primary mt-1">{preset.beatHz} Hz difference</span>
              <span className="block text-xs text-muted-foreground mt-2">{preset.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-5 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Meditation soundscape</h2>
            <p className="text-sm text-muted-foreground">Generated continuously in the browser with no downloaded audio track.</p>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={useSoundscape} onChange={(e) => setUseSoundscape(e.target.checked)} disabled={playing} />
            Enabled
          </label>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {SOUNDSCAPE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={playing || !useSoundscape}
              onClick={() => setSoundscapeId(preset.id)}
              className={`text-left rounded-lg border p-4 transition ${soundscapeId === preset.id ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <strong>{preset.label}</strong>
              <span className="block text-xs text-muted-foreground mt-2">{preset.description}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-xl border p-5 space-y-5">
        <h2 className="text-xl font-semibold">Session</h2>
        <label className="block space-y-2">
          <span className="flex items-center gap-2"><Volume2 className="w-4 h-4" /> Volume · {Math.round(volume * 100)}%</span>
          <input
            aria-label="Calm audio volume"
            className="w-full"
            type="range"
            min="0"
            max="0.45"
            step="0.01"
            value={volume}
            onChange={(e) => updateVolume(Number(e.target.value))}
          />
        </label>

        <label className="block space-y-2">
          <span>Session length · {durationMinutes} minutes</span>
          <input
            aria-label="Session length"
            className="w-full"
            type="range"
            min="1"
            max="60"
            step="1"
            value={durationMinutes}
            disabled={playing}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </label>

        {playing && <p className="text-2xl font-mono" aria-live="polite">{mins}:{String(secs).padStart(2, "0")} remaining</p>}

        <div className="flex flex-wrap gap-3">
          {!playing ? (
            <Button onClick={start} disabled={!useBinaural && !useSoundscape}>
              <Play className="w-4 h-4 mr-2" /> Start session
            </Button>
          ) : (
            <Button variant="destructive" onClick={stop}>
              <Pause className="w-4 h-4 mr-2" /> Stop
            </Button>
          )}
          <Button variant="outline" disabled={playing} onClick={() => {
            setBinauralId("theta")
            setSoundscapeId("deep-drone")
            setUseBinaural(true)
            setUseSoundscape(true)
            setVolume(0.18)
            setDurationMinutes(15)
          }}>
            <RotateCcw className="w-4 h-4 mr-2" /> Reset
          </Button>
        </div>
      </section>

      <section className="rounded-xl border p-5">
        <h2 className="font-semibold">Privacy</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This feature does not need an account, microphone, location, or network audio stream. Session choices stay in this page and are not sent to Heroes or Angel.
        </p>
      </section>
    </main>
  )
}
