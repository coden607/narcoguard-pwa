"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Camera, CameraOff, Heart, Phone, Syringe, Timer, X } from "lucide-react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { GlowButton } from "@/components/effects/glow-button"
import { Button } from "@/components/ui/button"
import { GUIDES, METRONOME_BPM, SECOND_DOSE_SECONDS, beatIntervalMs, formatClock, type GuideMode } from "@/lib/response-guides"

// Guided response steps. The person moves between steps; nothing advances on its own. The camera
// view is optional, shown only on this screen and never recorded or sent anywhere.

function SecondDoseTimer() {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (left === null || left <= 0) return
    const timer = setTimeout(() => setLeft((value) => (value === null ? null : value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [left])
  return (
    <div className="rounded-xl border p-3 space-y-2" data-testid="second-dose-timer">
      <p className="flex items-center gap-2 font-semibold"><Timer className="h-4 w-4" aria-hidden="true" />Second-dose timer</p>
      {left === null ? (
        <Button type="button" variant="outline" onClick={() => setLeft(SECOND_DOSE_SECONDS)}>Start 3-minute timer after the first dose</Button>
      ) : left > 0 ? (
        <p className="text-2xl font-bold tabular-nums" role="timer" aria-live="off">{formatClock(left)}</p>
      ) : (
        <p className="font-semibold text-amber-300" role="alert">3 minutes passed. No response? Give a second dose in the other nostril.</p>
      )}
    </div>
  )
}

function Metronome() {
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState(0)
  const audioRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setCount((value) => value + 1)
      const context = audioRef.current
      if (!context) return
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = 880
      gain.gain.setValueAtTime(0.25, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.08)
    }, beatIntervalMs(METRONOME_BPM))
    return () => clearInterval(interval)
  }, [running])

  useEffect(() => () => { audioRef.current?.close().catch(() => undefined) }, [])

  const toggle = () => {
    if (!running) {
      // Created on the tap so browsers allow sound.
      try {
        audioRef.current ??= new AudioContext()
        void audioRef.current.resume()
      } catch {
        audioRef.current = null
      }
      setCount(0)
    }
    setRunning(!running)
  }

  return (
    <div className="rounded-xl border p-3 space-y-2" data-testid="cpr-metronome">
      <p className="flex items-center gap-2 font-semibold"><Heart className="h-4 w-4 text-red-400" aria-hidden="true" />Compression beat: {METRONOME_BPM} per minute</p>
      <div className="flex items-center gap-4">
        <Button type="button" variant={running ? "default" : "outline"} aria-pressed={running} onClick={toggle}>{running ? "Stop beat" : "Start beat"}</Button>
        <span className={`inline-block h-6 w-6 rounded-full bg-red-500 ${running && count % 2 === 0 ? "scale-125" : "scale-90 opacity-60"} motion-safe:transition-transform`} aria-hidden="true" />
        <span className="tabular-nums" aria-live="off">{count} compressions{count >= 30 ? ` · ${Math.floor(count / 30)} set${count >= 60 ? "s" : ""} of 30` : ""}</span>
      </div>
      <p className="text-xs text-muted-foreground">The beat is a pace guide only. It cannot tell how deep or fast you are pushing.</p>
    </div>
  )
}

function GuideScreen({ mode, onExit }: { mode: GuideMode; onExit: () => void }) {
  const guide = GUIDES[mode]
  const [index, setIndex] = useState(0)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraNote, setCameraNote] = useState<string>()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const step = guide.steps[index]
  const last = index === guide.steps.length - 1

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), [])

  const startCamera = async () => {
    setCameraNote(undefined)
    if (!navigator.mediaDevices?.getUserMedia) return setCameraNote("This browser cannot show the camera. The steps work without it.")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setCameraOn(true)
    } catch {
      setCameraNote("Camera permission was not given. The steps work without it.")
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black text-white" role="dialog" aria-modal="true" aria-labelledby="guide-title" data-testid="guide-screen">
      <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 h-full w-full object-cover ${cameraOn ? "opacity-40" : "hidden"}`} aria-hidden="true" />
      <div className="relative flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="guide-title" className="text-xl font-bold font-orbitron">{guide.title}</h2>
          <div className="flex gap-2">
            <Button asChild className="bg-none bg-red-600 text-white hover:bg-red-700"><a href="tel:911"><Phone className="mr-2 h-4 w-4" aria-hidden="true" />Call 911</a></Button>
            <Button type="button" variant="outline" onClick={() => { stopCamera(); onExit() }}><X className="mr-2 h-4 w-4" aria-hidden="true" />Exit</Button>
          </div>
        </div>

        <p className="text-sm text-white/80" aria-live="polite">Step {index + 1} of {guide.steps.length}</p>
        <div className="h-2 overflow-hidden rounded-full bg-white/20" aria-hidden="true">
          <div className="h-full bg-primary transition-all" style={{ width: `${((index + 1) / guide.steps.length) * 100}%` }} />
        </div>

        <section className="mx-auto w-full max-w-2xl flex-1 space-y-4 rounded-2xl bg-black/70 p-5 backdrop-blur-xs" aria-live="polite">
          <h3 className="text-3xl font-bold">{step.title}</h3>
          <p className="text-lg leading-relaxed">{step.body}</p>
          {step.tool === "second-dose-timer" && <SecondDoseTimer />}
          {step.tool === "metronome" && <Metronome />}
        </section>

        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Back</Button>
          <Button type="button" variant="ghost" onClick={cameraOn ? stopCamera : startCamera}>
            {cameraOn ? <CameraOff className="mr-2 h-4 w-4" aria-hidden="true" /> : <Camera className="mr-2 h-4 w-4" aria-hidden="true" />}
            {cameraOn ? "Hide camera" : "Show camera behind steps"}
          </Button>
          {last ? (
            <Button type="button" onClick={() => { stopCamera(); onExit() }}>Done</Button>
          ) : (
            <Button type="button" onClick={() => setIndex(index + 1)}>Next step</Button>
          )}
        </div>
        {cameraNote && <p className="text-center text-sm" role="status">{cameraNote}</p>}
        <p className="text-center text-xs text-white/70">General guidance, not medical advice. Follow the 911 dispatcher&apos;s instructions.</p>
      </div>
    </div>
  )
}

export function ARGuidance() {
  const [mode, setMode] = useState<GuideMode | null>(null)

  return (
    <div className="space-y-4" id="ar-guidance">
      <HolographicCard className="p-6 sm:p-8 text-center" glowIntensity="high">
        <h2 className="text-2xl font-bold glow-text font-orbitron">STEP-BY-STEP GUIDES</h2>
        <p className="text-muted-foreground mt-2">
          Large, one-step-at-a-time instructions with a Call 911 button on every screen. You move on when you are ready.
          You can show your camera behind the steps; it is never recorded.
        </p>
      </HolographicCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <HolographicCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/20"><Syringe className="w-8 h-8 text-primary" aria-hidden="true" /></div>
              <h3 className="text-xl font-bold font-orbitron">NALOXONE</h3>
            </div>
            <p className="text-sm text-muted-foreground">Recognize an overdose, give nasal naloxone, support breathing, with a second-dose timer.</p>
            <GlowButton onClick={() => setMode("naloxone")} className="w-full">Start Naloxone Guide</GlowButton>
          </div>
        </HolographicCard>

        <HolographicCard className="p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-red-500/20"><Heart className="w-8 h-8 text-red-500" aria-hidden="true" /></div>
              <h3 className="text-xl font-bold font-orbitron">CPR</h3>
            </div>
            <p className="text-sm text-muted-foreground">Hand position, depth and a {METRONOME_BPM}-per-minute compression beat with a counter.</p>
            <GlowButton onClick={() => setMode("cpr")} className="w-full" variant="emergency">Start CPR Guide</GlowButton>
          </div>
        </HolographicCard>
      </div>

      {/* Portalled to <body> so no page stacking context (or the sticky header) can cover it. */}
      {mode && createPortal(<GuideScreen key={mode} mode={mode} onExit={() => setMode(null)} />, document.body)}
    </div>
  )
}
