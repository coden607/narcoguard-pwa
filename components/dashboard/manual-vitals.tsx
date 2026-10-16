"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Camera, Wind } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  BREATH_COUNT_SECONDS, MEASURE_SECONDS, PULSE_FAILURE_MESSAGE, breathsPerMinute, estimatePulse, fingerCovers, type FrameSample,
} from "@/lib/camera-pulse"

type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }
type VideoWithFrames = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number; cancelVideoFrameCallback?: (id: number) => void }

type PulseState =
  | { phase: "idle" }
  | { phase: "measuring"; secondsLeft: number; covered: boolean; torch: boolean }
  | { phase: "done"; bpm: number }
  | { phase: "failed"; message: string }

/** Fingertip pulse estimate from the back camera. Frames are read on the device and discarded. */
function CameraPulse() {
  const [state, setState] = useState<PulseState>({ phase: "idle" })
  const videoRef = useRef<VideoWithFrames | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stopRef = useRef<() => void>(() => undefined)

  const stop = useCallback(() => {
    stopRef.current()
    stopRef.current = () => undefined
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  useEffect(() => stop, [stop])

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({ phase: "failed", message: "This browser cannot use the camera. Try Chrome or Safari, or count the pulse by hand for 30 seconds and double it." })
      return
    }
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 160 }, height: { ideal: 120 }, frameRate: { ideal: 30 } }, audio: false })
    } catch {
      setState({ phase: "failed", message: "Camera permission was not given, so the pulse check could not start. Nothing else in the app needs the camera." })
      return
    }
    streamRef.current = stream
    const track = stream.getVideoTracks()[0]
    let torch = false
    if ((track.getCapabilities?.() as TorchCapabilities | undefined)?.torch) {
      try { await track.applyConstraints({ advanced: [{ torch: true } as MediaTrackConstraintSet] }); torch = true } catch { torch = false }
    }
    const video = videoRef.current
    if (!video) { stop(); return }
    video.srcObject = stream
    await video.play().catch(() => undefined)

    const canvas = document.createElement("canvas")
    canvas.width = 32
    canvas.height = 24
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) { stop(); setState({ phase: "failed", message: "This browser cannot read camera frames." }); return }

    const samples: FrameSample[] = []
    const startedAt = performance.now()
    let handle = 0
    let cancelled = false
    stopRef.current = () => {
      cancelled = true
      if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(handle)
      else cancelAnimationFrame(handle)
    }
    const schedule = (cb: () => void) => { handle = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(cb) : requestAnimationFrame(cb) }

    const onFrame = () => {
      if (cancelled) return
      const t = performance.now() - startedAt
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
      let red = 0, green = 0
      for (let i = 0; i < data.length; i += 4) { red += data[i]; green += data[i + 1] }
      const pixels = data.length / 4
      const sample = { t, red: red / pixels, green: green / pixels }
      samples.push(sample)
      if (t >= MEASURE_SECONDS * 1000) {
        stop()
        const result = estimatePulse(samples)
        setState(result.ok ? { phase: "done", bpm: result.bpm } : { phase: "failed", message: PULSE_FAILURE_MESSAGE[result.reason] })
        return
      }
      setState({ phase: "measuring", secondsLeft: Math.ceil(MEASURE_SECONDS - t / 1000), covered: fingerCovers(sample), torch })
      schedule(onFrame)
    }
    setState({ phase: "measuring", secondsLeft: MEASURE_SECONDS, covered: false, torch })
    schedule(onFrame)
  }

  return (
    <div className="space-y-2" data-testid="camera-pulse">
      <h5 className="flex items-center gap-2 font-semibold"><Camera className="h-4 w-4" aria-hidden="true" />Pulse check with your camera</h5>
      <p className="text-sm text-muted-foreground">
        Cover the back camera and flash with one fingertip, press lightly and hold still for {MEASURE_SECONDS} seconds.
        Video stays on this phone and is not saved.
      </p>
      <video ref={videoRef} className="sr-only" muted playsInline aria-hidden="true" />
      {state.phase === "measuring" ? (
        <div className="space-y-2" role="status" aria-live="polite">
          <p className="font-semibold">{state.secondsLeft}s left · {state.covered ? "Fingertip detected" : "Cover the camera fully with your fingertip"}</p>
          {!state.torch && <p className="text-xs text-muted-foreground">This phone did not let the app turn on the flash. Use a bright light behind your finger.</p>}
          <Button type="button" variant="outline" onClick={() => { stop(); setState({ phase: "idle" }) }}>Stop</Button>
        </div>
      ) : (
        <Button type="button" onClick={() => void start()} data-testid="start-camera-pulse">{state.phase === "idle" ? "Start pulse check" : "Check again"}</Button>
      )}
      {state.phase === "done" && (
        <p className="text-lg font-bold" role="status" data-testid="camera-pulse-result">About {state.bpm} beats a minute <span className="text-sm font-normal text-muted-foreground">(estimate)</span></p>
      )}
      {state.phase === "failed" && <p className="text-sm" role="status" data-testid="camera-pulse-error">{state.message}</p>}
    </div>
  )
}

/** Count breaths by tapping once each time the chest rises, for a fixed time. */
function BreathCounter() {
  const [taps, setTaps] = useState(0)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [result, setResult] = useState<number | null>(null)
  const tapsRef = useRef(0)

  useEffect(() => {
    if (secondsLeft === null) return
    if (secondsLeft === 0) {
      setResult(breathsPerMinute(tapsRef.current, BREATH_COUNT_SECONDS))
      setSecondsLeft(null)
      return
    }
    const timer = window.setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [secondsLeft])

  const begin = () => { tapsRef.current = 0; setTaps(0); setResult(null); setSecondsLeft(BREATH_COUNT_SECONDS) }
  const tap = () => { tapsRef.current += 1; setTaps(tapsRef.current) }

  return (
    <div className="space-y-2" data-testid="breath-counter">
      <h5 className="flex items-center gap-2 font-semibold"><Wind className="h-4 w-4" aria-hidden="true" />Breathing count</h5>
      <p className="text-sm text-muted-foreground">Watch the chest. Tap once each time it rises, for {BREATH_COUNT_SECONDS} seconds.</p>
      {secondsLeft !== null ? (
        <div className="space-y-2">
          <p className="font-semibold" role="status" aria-live="polite">{secondsLeft}s left · {taps} breath{taps === 1 ? "" : "s"}</p>
          <Button type="button" className="h-20 w-full text-lg" onClick={tap} data-testid="breath-tap">Tap each breath</Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={begin} data-testid="start-breath-count">{result === null ? "Start breathing count" : "Count again"}</Button>
      )}
      {result !== null && (
        <p className="text-lg font-bold" role="status" data-testid="breath-result">{result} breaths a minute</p>
      )}
    </div>
  )
}

/** Vitals anyone can check without extra hardware. Results are shown here only, never stored or used for alerts. */
export function ManualVitals() {
  return (
    <section className="space-y-4 text-left" aria-labelledby="manual-vitals-heading" data-testid="manual-vitals">
      <h4 id="manual-vitals-heading" className="font-semibold">Check vitals with this phone</h4>
      <CameraPulse />
      <BreathCounter />
      <p className="text-xs text-muted-foreground">
        For reference, a resting adult usually has a pulse of 60–100 beats and 12–20 breaths a minute. These checks are estimates, not
        medical measurements, and NarcoGuard does not use them to detect overdoses or alert anyone. Slow, gurgling or stopped breathing,
        or someone who won&apos;t wake up, needs 911 and naloxone now, whatever a number says.
      </p>
    </section>
  )
}
