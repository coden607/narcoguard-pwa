"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import { AlarmClock, Bluetooth, Moon, Pause, Play, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useBluetoothVitals } from "@/lib/hooks/use-bluetooth-vitals"
import { useVitals } from "@/lib/hooks/use-vitals"
import { useWakeLock } from "@/lib/hooks/use-wake-lock"
import {
  CALM_ONLY_MAX_VOLUME,
  DEFAULT_SLEEP_VOLUME,
  PULSE_SCHEDULE,
  RECOVERY_SLEEP_LOG_KEY,
  RECOVERY_SLEEP_OPT_IN_KEY,
  SLEEP_MAX_VOLUME,
  addSleepLogEntry,
  clampSleepVolume,
  detectRiskFlags,
  evaluateSleepGate,
  parseSleepLog,
  pulsePhase,
  rateSleepLogEntry,
  sessionMinutes,
  sleepTimerSeconds,
  summarizeSleepLog,
  type HeartRateSample,
  type RecentUseAnswer,
  type RiskFlag,
  type SleepLogEntry,
  type SleepMode,
  type SleepRating,
} from "@/lib/recovery-sleep"

const CHANGE_EVENT = "narcoguard:recovery-sleep-change"

function subscribeStorage(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}
const readKey = (key: string) => () => {
  try { return localStorage.getItem(key) } catch { return null }
}
function writeKey(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch { /* storage blocked: the choice lasts for this page only */ }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Pink noise (Paul Kellet's filter), generated on this device. No audio files are used. */
function makePinkBuffer(context: AudioContext) {
  const buffer = context.createBuffer(1, context.sampleRate * 8, context.sampleRate)
  const data = buffer.getChannelData(0)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.969 * b2 + white * 0.153852
    b3 = 0.8665 * b3 + white * 0.3104856
    b4 = 0.55 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.016898
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
    b6 = white * 0.115926
  }
  return buffer
}

type Session = {
  context: AudioContext
  master: GainNode
  pulseGain: GainNode | null
  sources: AudioBufferSourceNode[]
  mode: SleepMode
  startedAt: number
  endsAt: number
  lastBlock: number
}

const subscribeClock = (onTick: () => void) => {
  const id = window.setInterval(onTick, 1000)
  return () => window.clearInterval(id)
}
const readClock = () => Math.floor(Date.now() / 1000) * 1000

export default function RecoverySleepPage() {
  const optInRaw = useSyncExternalStore(subscribeStorage, readKey(RECOVERY_SLEEP_OPT_IN_KEY), () => null)
  const logRaw = useSyncExternalStore(subscribeStorage, readKey(RECOVERY_SLEEP_LOG_KEY), () => null)
  const optedIn = optInRaw === "on"
  const log = parseSleepLog(logRaw)
  const summary = summarizeSleepLog(log)
  const now = useSyncExternalStore(subscribeClock, readClock, () => 0)

  // Overdose-risk inputs. Recovery Sleep only reads these; it never pauses or changes them.
  const { vitals, overdoseCheck, status: vitalsStatus, message: vitalsMessage } = useVitals()
  const ble = useBluetoothVitals()

  const [recentUse, setRecentUse] = useState<RecentUseAnswer | null>(null)
  const [requestedMode, setRequestedMode] = useState<SleepMode>("calm")
  const [volume, setVolume] = useState(DEFAULT_SLEEP_VOLUME)
  const [timerMinutes, setTimerMinutes] = useState(45)
  const [alarmTime, setAlarmTime] = useState("")
  const [playing, setPlaying] = useState(false)
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [alarmSounding, setAlarmSounding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [pulseStatus, setPulseStatus] = useState<string | null>(null)

  const sessionRef = useRef<Session | null>(null)
  const tickRef = useRef<number | null>(null)
  const alarmRef = useRef<{ context: AudioContext; interval: number } | null>(null)
  const samplesRef = useRef<HeartRateSample[]>([])
  const latestRef = useRef<{ flags: RiskFlag[]; alarmAt: number | null }>({ flags: [], alarmAt: null })

  useWakeLock(playing)

  const riskFlags = detectRiskFlags({
    now,
    overdoseCheck: vitalsStatus === "live" ? overdoseCheck : null,
    respiratoryRate: vitalsStatus === "live" ? vitals?.respiratoryRate : null,
    spO2: ble.vitals.spO2,
    spO2At: ble.vitals.spO2At,
    heartRate: ble.vitals.heartRate,
    heartRateAt: ble.vitals.heartRateAt,
    wakeAlarm: alarmSounding,
  })
  const gate = evaluateSleepGate({ optedIn, recentUse, requestedMode, riskFlags })
  const maxVolume = recentUse === "yes" ? CALM_ONLY_MAX_VOLUME : SLEEP_MAX_VOLUME

  // Keep the latest values where the session tick (an interval, not render) can read them.
  useEffect(() => {
    latestRef.current.flags = riskFlags
  })
  useEffect(() => {
    const at = ble.vitals.heartRateAt
    const bpm = ble.vitals.heartRate
    if (sessionRef.current && at !== undefined && bpm !== undefined) {
      const last = samplesRef.current.at(-1)
      if (!last || last.at !== at) samplesRef.current = [...samplesRef.current.slice(-2000), { at, bpm }]
    }
  }, [ble.vitals.heartRate, ble.vitals.heartRateAt])

  const saveLog = useCallback((next: SleepLogEntry[]) => writeKey(RECOVERY_SLEEP_LOG_KEY, JSON.stringify(next)), [])

  /** Stops all sleep audio immediately: no fade, sources stopped, context closed. */
  const stopNow = useCallback((endedBy: SleepLogEntry["endedBy"], message?: string) => {
    if (tickRef.current !== null) window.clearInterval(tickRef.current)
    tickRef.current = null
    const session = sessionRef.current
    sessionRef.current = null
    if (session) {
      try {
        session.master.gain.cancelScheduledValues(0)
        session.master.gain.setValueAtTime(0, session.context.currentTime)
      } catch { /* context already closed */ }
      session.sources.forEach((source) => { try { source.stop() } catch { /* already stopped */ } })
      void session.context.close().catch(() => undefined)
      const endedAt = Date.now()
      if (endedAt - session.startedAt >= 60_000) {
        saveLog(addSleepLogEntry(parseSleepLog(readKey(RECOVERY_SLEEP_LOG_KEY)()), {
          id: `${session.startedAt}`,
          startedAt: session.startedAt,
          endedAt,
          mode: session.mode,
          endedBy,
        }))
      }
    }
    samplesRef.current = []
    setPlaying(false)
    setPulseStatus(null)
    setRecentUse(null) // the check-in is asked again before every session and never stored
    if (message) setNotice(message)
  }, [saveLog])

  const startAlarm = useCallback(() => {
    if (alarmRef.current) return
    const context = new window.AudioContext()
    const beep = () => {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = "square"
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.25, context.currentTime)
      gain.gain.setValueAtTime(0, context.currentTime + 0.35)
      osc.connect(gain).connect(context.destination)
      osc.start()
      osc.stop(context.currentTime + 0.4)
      navigator.vibrate?.([300, 200, 300])
    }
    beep()
    alarmRef.current = { context, interval: window.setInterval(beep, 900) }
    setAlarmSounding(true)
  }, [])

  const stopAlarm = useCallback(() => {
    const alarm = alarmRef.current
    alarmRef.current = null
    if (alarm) {
      window.clearInterval(alarm.interval)
      void alarm.context.close().catch(() => undefined)
    }
    setAlarmSounding(false)
  }, [])

  useEffect(() => () => {
    if (tickRef.current !== null) window.clearInterval(tickRef.current)
    sessionRef.current?.sources.forEach((source) => { try { source.stop() } catch { /* stopped */ } })
    void sessionRef.current?.context.close().catch(() => undefined)
    const alarm = alarmRef.current
    if (alarm) {
      window.clearInterval(alarm.interval)
      void alarm.context.close().catch(() => undefined)
    }
  }, [])

  const schedulePulses = (session: Session, at: number) => {
    const phase = pulsePhase({ now: at, startedAt: session.startedAt, samples: samplesRef.current })
    if (phase.phase === "waiting") setPulseStatus("Waiting for estimated sleep onset. Plain pink noise only.")
    else if (phase.phase === "paused") setPulseStatus("Pulses paused: heart rate rose, which can mean you stirred.")
    else if (phase.phase === "done") setPulseStatus("Pulse window finished for tonight. Plain pink noise only.")
    else setPulseStatus("Timed pulse window active.")
    if (phase.phase !== "on" || phase.onsetAt === null || !session.pulseGain) return
    const blockMs = PULSE_SCHEDULE.pulsesPerBlock * PULSE_SCHEDULE.pulseIntervalMs
    const cycle = blockMs + PULSE_SCHEDULE.offBlockMs
    const block = Math.floor((at - phase.onsetAt) / cycle)
    if (block === session.lastBlock) return
    session.lastBlock = block
    const intoBlock = (at - phase.onsetAt) % cycle
    const gain = session.pulseGain.gain
    const base = session.context.currentTime
    for (let i = 0; i < PULSE_SCHEDULE.pulsesPerBlock; i++) {
      const offsetMs = i * PULSE_SCHEDULE.pulseIntervalMs - intoBlock
      if (offsetMs < 0) continue
      const t = base + offsetMs / 1000
      gain.setValueAtTime(0, t)
      gain.linearRampToValueAtTime(0.9, t + 0.005)
      gain.setValueAtTime(0.9, t + PULSE_SCHEDULE.pulseLengthMs / 1000 - 0.005)
      gain.linearRampToValueAtTime(0, t + PULSE_SCHEDULE.pulseLengthMs / 1000)
    }
  }

  const start = async () => {
    setNotice(null)
    if (!gate.allowed || sessionRef.current) return
    const AudioContextClass = window.AudioContext
    if (!AudioContextClass) { setNotice("This browser cannot play generated audio."); return }
    const context = new AudioContextClass()
    await context.resume()
    const master = context.createGain()
    const safe = clampSleepVolume(volume, gate.maxVolume)
    master.gain.setValueAtTime(0, context.currentTime)
    master.gain.linearRampToValueAtTime(safe, context.currentTime + 3)
    master.connect(context.destination)

    const pink = makePinkBuffer(context)
    const bed = context.createBufferSource()
    bed.buffer = pink
    bed.loop = true
    const bedGain = context.createGain()
    bedGain.gain.value = 0.6
    bed.connect(bedGain).connect(master)
    bed.start()
    const sources = [bed]

    let pulseGain: GainNode | null = null
    if (gate.mode === "pulses") {
      const pulses = context.createBufferSource()
      pulses.buffer = pink
      pulses.loop = true
      pulseGain = context.createGain()
      pulseGain.gain.value = 0
      pulses.connect(pulseGain).connect(master)
      pulses.start()
      sources.push(pulses)
    }

    const startedAt = Date.now()
    const session: Session = { context, master, pulseGain, sources, mode: gate.mode, startedAt, endsAt: startedAt + sleepTimerSeconds(timerMinutes) * 1000, lastBlock: -1 }
    sessionRef.current = session
    samplesRef.current = []
    setEndsAt(session.endsAt)
    setPlaying(true)

    const [alarmH, alarmM] = alarmTime.split(":").map(Number)
    let alarmAt: number | null = null
    if (Number.isFinite(alarmH) && Number.isFinite(alarmM) && alarmTime) {
      const target = new Date()
      target.setHours(alarmH, alarmM, 0, 0)
      if (target.getTime() <= startedAt) target.setDate(target.getDate() + 1)
      alarmAt = target.getTime()
    }
    latestRef.current.alarmAt = alarmAt

    tickRef.current = window.setInterval(() => {
      const current = sessionRef.current
      if (!current) return
      const at = Date.now()
      const flags = latestRef.current.flags
      // Safety first: any risk signal or alert stops all sleep audio at once.
      if (flags.length > 0) {
        stopNow("safety", "Recovery Sleep audio stopped because a safety signal appeared. Overdose monitoring was not changed.")
        return
      }
      const due = latestRef.current.alarmAt
      if (due !== null && at >= due) {
        stopNow("alarm")
        startAlarm()
        return
      }
      if (at >= current.endsAt) {
        stopNow("timer", "Sleep timer finished. Audio stopped.")
        return
      }
      if (current.mode === "pulses") schedulePulses(current, at)
    }, 250)
  }

  const updateVolume = (next: number) => {
    const safe = clampSleepVolume(next, maxVolume)
    setVolume(safe)
    const session = sessionRef.current
    if (session) {
      const t = session.context.currentTime
      session.master.gain.cancelScheduledValues(t)
      session.master.gain.linearRampToValueAtTime(safe, t + 0.1)
    }
  }

  const remaining = playing && endsAt !== null ? Math.max(0, Math.round((endsAt - now) / 1000)) : 0

  return (
    <main className="max-w-4xl mx-auto p-4 sm:p-8 space-y-7">
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <Moon className="w-8 h-8 text-primary" aria-hidden="true" />
          <h1 className="text-3xl font-bold">Recovery Sleep</h1>
        </div>
        <p className="text-muted-foreground">
          Optional wind-down sound and a private sleep log for people in recovery. Sleep is often hard during withdrawal and early recovery,
          including on methadone or buprenorphine. Pink noise is generated on this device; nothing is streamed or uploaded.
        </p>
      </header>

      <section className="rounded-xl border border-yellow-500/50 p-5 space-y-2" aria-labelledby="sleep-disclaimer">
        <h2 id="sleep-disclaimer" className="text-xl font-semibold flex items-center gap-2"><ShieldAlert className="w-5 h-5" aria-hidden="true" /> Please read first</h2>
        <p className="text-sm">
          Recovery Sleep is a wellness feature. It is not a medical device, it does not diagnose or treat insomnia or any sleep disorder,
          and it does not prevent or reverse an overdose. Opioids and sedatives can make it harder to wake up, so this page will not play
          the experimental pulse mode after recent use, and any NarcoGuard safety signal or alarm stops all of its audio at once.
        </p>
        <p className="text-sm">
          Recovery Sleep never pauses or changes overdose monitoring, safety alerts or emergency contacts. Never use alone after using:
          keep naloxone nearby and use a check-in or never-use-alone service. In an emergency call 911.
        </p>
      </section>

      <section className="rounded-xl border p-5 space-y-3" aria-labelledby="sleep-optin">
        <h2 id="sleep-optin" className="text-xl font-semibold">Turn Recovery Sleep on</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={optedIn} disabled={playing} onChange={(e) => writeKey(RECOVERY_SLEEP_OPT_IN_KEY, e.target.checked ? "on" : null)} />
          <span>I want to use Recovery Sleep on this device (off by default)</span>
        </label>
      </section>

      {optedIn && (
        <>
          <section className="rounded-xl border p-5 space-y-3" aria-labelledby="sleep-monitoring">
            <h2 id="sleep-monitoring" className="text-xl font-semibold">Safety signals Recovery Sleep listens to</h2>
            <ul className="text-sm space-y-1 list-disc pl-5">
              <li>
                NarcoGuard vitals service:{" "}
                {vitalsStatus === "live" ? "live readings connected" : vitalsStatus === "loading" ? "checking…" : vitalsMessage ?? "not connected"}
              </li>
              <li>
                Bluetooth heart-rate or oxygen device:{" "}
                {ble.status === "connected" ? `connected (${ble.deviceName})` : ble.status === "unsupported" ? "this browser cannot connect to one" : "not connected"}
              </li>
            </ul>
            {ble.supported && ble.status !== "connected" && (
              <Button variant="outline" onClick={() => void ble.connect()}><Bluetooth className="w-4 h-4 mr-2" aria-hidden="true" />Connect a Bluetooth device</Button>
            )}
            {ble.message && <p className="text-sm text-muted-foreground">{ble.message}</p>}
            <p className="text-xs text-muted-foreground">
              Audio stops if blood oxygen drops below 92%, heart rate below 40, breathing below 10 per minute, or the vitals service reports any overdose-risk alert.
              These readings come from consumer devices and are not a substitute for a person checking on you.
            </p>
            {riskFlags.length > 0 && <p role="alert" className="text-sm font-semibold text-red-500">{gate.reason}</p>}
          </section>

          <section className="rounded-xl border p-5 space-y-5" aria-labelledby="sleep-checkin">
            <h2 id="sleep-checkin" className="text-xl font-semibold">Before you start</h2>
            <fieldset className="space-y-2" disabled={playing}>
              <legend className="text-sm font-medium">Have you used opioids or sedatives (including alcohol, benzos or sleep pills) in the last 24 hours?</legend>
              <label className="flex items-center gap-2"><input type="radio" name="recent-use" checked={recentUse === "yes"} onChange={() => setRecentUse("yes")} /> Yes</label>
              <label className="flex items-center gap-2"><input type="radio" name="recent-use" checked={recentUse === "no"} onChange={() => setRecentUse("no")} /> No</label>
              <p className="text-xs text-muted-foreground">Your answer is used for this session only. It is never saved or sent anywhere, and it is asked again next time.</p>
            </fieldset>
            {recentUse === "yes" && (
              <p className="text-sm rounded-lg border border-primary/40 p-3">
                Thanks for being honest. Tonight Recovery Sleep offers only plain calming sound at a lower volume, with no pulse mode.
                Please don&apos;t sleep alone if you can avoid it, keep naloxone within reach, and sleep on your side.
              </p>
            )}

            <fieldset className="space-y-3" disabled={playing}>
              <legend className="text-sm font-medium">Sound</legend>
              <label className="flex items-start gap-2">
                <input type="radio" name="sleep-mode" checked={requestedMode === "calm"} onChange={() => setRequestedMode("calm")} />
                <span><strong>Plain pink noise</strong><span className="block text-xs text-muted-foreground">A steady, soft sound that can mask noise while you fall asleep.</span></span>
              </label>
              <label className="flex items-start gap-2">
                <input type="radio" name="sleep-mode" checked={requestedMode === "pulses"} disabled={recentUse === "yes"} onChange={() => setRequestedMode("pulses")} />
                <span>
                  <strong>Timed pink-noise pulses (experimental)</strong>
                  <span className="block text-xs text-muted-foreground">
                    In sleep labs, short pulses of pink noise timed to deep-sleep brain waves measured by EEG increased slow-wave activity in small studies.
                    A phone or watch cannot measure brain waves, so this mode only approximates the timing: it waits about {PULSE_SCHEDULE.defaultOnsetMinutes} minutes
                    (or until a connected heart-rate device suggests you have settled), then plays brief pulse groups during the first few hours and pauses if your heart rate rises.
                    It may do nothing for you, and NarcoGuard does not claim it improves sleep or memory. Not available after recent use.
                  </span>
                </span>
              </label>
            </fieldset>

            <label className="block space-y-2">
              <span>Volume (capped at {Math.round(maxVolume * 100)}%)</span>
              <input aria-label="Sleep sound volume" className="w-full" type="range" min="0" max={maxVolume} step="0.01" value={Math.min(volume, maxVolume)} onChange={(e) => updateVolume(Number(e.target.value))} />
            </label>
            <label className="block space-y-2">
              <span>Sleep timer · {timerMinutes} minutes</span>
              <input aria-label="Sleep timer" className="w-full" type="range" min="5" max="480" step="5" value={timerMinutes} disabled={playing} onChange={(e) => setTimerMinutes(Number(e.target.value))} />
            </label>
            <label className="block space-y-2">
              <span className="flex items-center gap-2"><AlarmClock className="w-4 h-4" aria-hidden="true" />Wake-up alarm (optional)</span>
              <input aria-label="Wake-up alarm time" type="time" className="rounded border bg-background px-2 py-1" value={alarmTime} disabled={playing} onChange={(e) => setAlarmTime(e.target.value)} />
              <span className="block text-xs text-muted-foreground">The alarm stops the sleep sound first. Keep this page open and the phone charging; browsers may not play sound from a closed tab.</span>
            </label>

            {playing && <p className="text-2xl font-mono" aria-live="polite">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")} remaining</p>}
            {pulseStatus && <p className="text-sm text-muted-foreground" aria-live="polite">{pulseStatus}</p>}
            {!playing && !gate.allowed && <p className="text-sm text-muted-foreground">{gate.reason}</p>}
            {!playing && gate.allowed && <p className="text-sm text-muted-foreground">{gate.reason}</p>}
            {notice && <p className="text-sm" role="status">{notice}</p>}

            <div className="flex flex-wrap gap-3">
              {!playing ? (
                <Button onClick={() => void start()} disabled={!gate.allowed}><Play className="w-4 h-4 mr-2" aria-hidden="true" />Start Recovery Sleep</Button>
              ) : (
                <Button variant="destructive" onClick={() => stopNow("stopped")}><Pause className="w-4 h-4 mr-2" aria-hidden="true" />Stop</Button>
              )}
              {alarmSounding && <Button variant="outline" onClick={stopAlarm}>I&apos;m awake: stop alarm</Button>}
            </div>
          </section>

          <section className="rounded-xl border p-5 space-y-3" aria-labelledby="sleep-log">
            <h2 id="sleep-log" className="text-xl font-semibold">My sleep log</h2>
            <p className="text-xs text-muted-foreground">Stored only in this browser. It is never uploaded or shared with Heroes, contacts or Angel.</p>
            {!summary ? (
              <p className="text-sm text-muted-foreground">No sessions yet. Sessions of a minute or longer are added here automatically.</p>
            ) : (
              <>
                <p className="text-sm">
                  {summary.sessions} session{summary.sessions === 1 ? "" : "s"} logged, averaging {summary.averageMinutes} minutes of sound.
                  {summary.averageRating !== null && ` Your average morning rating is ${summary.averageRating} of 5 (${summary.rated} rated).`}
                </p>
                <ul className="space-y-2">
                  {log.slice(0, 14).map((entry) => (
                    <li key={entry.id} className="rounded-lg border p-3 text-sm flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {new Date(entry.startedAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · {sessionMinutes(entry)} min ·{" "}
                        {entry.mode === "pulses" ? "timed pulses" : "plain sound"}
                        {entry.endedBy === "safety" ? " · stopped for safety" : entry.endedBy === "alarm" ? " · ended by alarm" : ""}
                      </span>
                      <span className="flex items-center gap-1" aria-label="How rested did you feel?">
                        {([1, 2, 3, 4, 5] as SleepRating[]).map((value) => (
                          <button key={value} type="button" aria-pressed={entry.rating === value} aria-label={`Rate ${value} of 5`}
                            className={`h-8 w-8 rounded border ${entry.rating === value ? "border-primary bg-primary/20" : ""}`}
                            onClick={() => saveLog(rateSleepLogEntry(log, entry.id, value))}>{value}</button>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" onClick={() => writeKey(RECOVERY_SLEEP_LOG_KEY, null)}>Delete my sleep log</Button>
              </>
            )}
          </section>
        </>
      )}

      <section className="rounded-xl border p-5 space-y-2">
        <h2 className="font-semibold">More ways to wind down</h2>
        <p className="text-sm text-muted-foreground">
          <Link href="/calm" className="underline text-primary">Calm Audio</Link> has breathing-friendly soundscapes, and the{" "}
          <Link href="/stability" className="underline text-primary">needs planner</Link> lets you note sleep alongside food and other everyday needs.
        </p>
      </section>
    </main>
  )
}
