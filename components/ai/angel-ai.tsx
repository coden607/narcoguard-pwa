"use client"

import { forgetPlace, PLACE_FORGOTTEN_EVENT, REMEMBER_PLACE_KEY, SAVED_PLACE_KEY, readRememberChoice, readSavedPlace, saveRememberChoice, savePlace, zipFromMessage } from "@/lib/saved-place"
import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LocateFixed, Mic, MicOff, Send, Sparkles, Volume2, VolumeX } from "lucide-react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { coarsen } from "@/lib/resource-finder"
import { spokenResourceSummary, type AngelResources } from "@/lib/angel-resources"
import { useVoice } from "@/lib/hooks/use-voice"
import { isFatalRecognitionError, speakableText } from "@/lib/voice"
import { parseAngelLocalCommand } from "@/lib/angel-voice-commands"
import { routeAngelTurn } from "@/lib/angel-routing"
import { useUserPreferences } from "@/lib/hooks/use-user-preferences"
import { readDailyLifeState } from "@/lib/daily-life"
import { readLifeSupportState } from "@/lib/life-support"
import { readResourcePreferences } from "@/lib/resource-personalization"
import { angelContextHasContent, buildAngelLocalContext } from "@/lib/angel-context"
import { beginAngelAttempt, finishAngelAttempt, type AngelPendingTurn } from "@/lib/angel-pending"
import { deactivateTravel, effectiveZip, readTravel } from "@/lib/travel-mode"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  notices?: string[]
  resources?: AngelResources
}

const SUGGESTIONS = ["Help me set a goal for this week", "Find food and a place to sleep near me", "How do I get naloxone?"]

export function angelProviderDisclosure(provider: string | null, privacy: string | null, strictPrivacy: boolean) {
  if (provider === "Kimi") return "Your messages are sent to Kimi (Moonshot AI) to write Angel's replies. NarcoGuard has not confirmed Moonshot's retention or training terms, so share only what you are comfortable with."
  if (provider === "Vercel AI Gateway") return "Your messages are sent through Vercel AI Gateway to the configured AI model. NarcoGuard requests zero data retention on this route."
  if (provider === "OpenRouter") return "Your messages are sent through OpenRouter to an AI provider. NarcoGuard asks OpenRouter to deny provider data collection for Angel requests."
  if (provider === "OpenAI-compatible") return strictPrivacy
    ? "Angel is configured for strict privacy, so this direct OpenAI-compatible route will not be used."
    : "Your messages are sent directly to the configured OpenAI-compatible provider. Its retention and training terms depend on the provider configured by NarcoGuard."
  if (provider === "Groq") return "Your messages are sent to Groq to write Angel's replies. Provider privacy terms apply."
  return privacy === "zero-data-retention" ? "Angel is using a route configured for zero data retention." : "Angel uses a configured AI provider to write replies. Provider privacy terms apply."
}

export function AngelAI({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const preferences = useUserPreferences()
  const voiceEnabled = preferences?.features.voiceActivation ?? true
  // Conversations live only in this component's memory; nothing is saved to the device or server.
  const [available, setAvailable] = useState<boolean | null>(null)
  const [availabilityFailed, setAvailabilityFailed] = useState(false)
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0)
  const [provider, setProvider] = useState<string | null>(null)
  const [privacy, setPrivacy] = useState<string | null>(null)
  const [strictPrivacy, setStrictPrivacy] = useState(false)
  const [consented, setConsented] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [zip, setZip] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState<AngelPendingTurn | null>(null)
  const pendingRef = useRef<AngelPendingTurn | null>(null)
  const requestRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const messagesRef = useRef<ChatMessage[]>([])
  const voice = useVoice()
  const [readAloud, setReadAloud] = useState(false)
  const [handsFree, setHandsFree] = useState(false)
  const handsFreeRef = useRef(false)
  const [voiceNote, setVoiceNote] = useState<string>()
  const [usePlanningContext, setUsePlanningContext] = useState(false)
  // Approximate location for searches, kept in memory only and rounded to about 1 km before it leaves the device.
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null)
  const locationRef = useRef<{ lat: number; lon: number } | null>(null)
  const locationGenerationRef = useRef(0)
  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string>()
  // Where to search is remembered on this phone only (rounded), so it is entered once; one tap forgets it.
  const [rememberPlace, setRememberPlace] = useState(true)

  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    const cancelLocation = () => { locationGenerationRef.current++ }
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
      requestRef.current?.abort()
      pendingRef.current = null
      cancelLocation()
      locationRef.current = null
    }
  }, [])

  const cancelPending = useCallback(() => {
    requestRef.current?.abort()
    requestRef.current = null
    pendingRef.current = null
    setPending(null)
    setBusy(false)
    setError(undefined)
  }, [])

  // A pending request contains a snapshot of sharing choices. Discard that
  // payload when choices change; the draft can be sent again with fresh consent.
  const invalidatePendingContext = useCallback(() => {
    const turn = pendingRef.current
    if (!turn) return
    cancelPending()
    setInput((draft) => draft.trim() && draft !== turn.content ? `${turn.content}\n\n${draft}` : turn.content)
    setError("Sharing choices changed. The pending request was cancelled. Review your draft and send it again when ready.")
  }, [cancelPending])

  useEffect(() => {
    // Consume revocation without writing storage or rebroadcasting the event.
    const revoke = () => {
      locationGenerationRef.current++
      invalidatePendingContext()
      locationRef.current = null
      setLocation(null)
      setLocationNote(undefined)
      setLocating(false)
      setZip("")
      setRememberPlace(readRememberChoice(window.localStorage))
    }
    const storageChanged = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return
      if (event.key === null || (event.key === SAVED_PLACE_KEY && event.newValue === null) || (event.key === REMEMBER_PLACE_KEY && event.newValue === "off")) revoke()
    }
    window.addEventListener(PLACE_FORGOTTEN_EVENT, revoke)
    window.addEventListener("storage", storageChanged)
    return () => {
      window.removeEventListener(PLACE_FORGOTTEN_EVENT, revoke)
      window.removeEventListener("storage", storageChanged)
    }
  }, [invalidatePendingContext])

  const clearConversation = () => {
    cancelPending()
    messagesRef.current = []
    setMessages([])
    setInput("")
  }

  /** A user click is required for every attempt. Connectivity changes never send. */
  const attemptPending = async (): Promise<string | null> => {
    if (!pendingRef.current) return null
    const turn = beginAngelAttempt(pendingRef.current, navigator.onLine)
    if (!turn) return null
    pendingRef.current = turn
    setPending(turn)
    setBusy(true)
    setError(undefined)
    const controller = new AbortController()
    requestRef.current = controller
    try {
      const response = await fetch("/api/angel", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: turn.body, signal: controller.signal,
      })
      const body = (await response.json()) as { available?: boolean; reply?: string; error?: string; notices?: string[]; resources?: ChatMessage["resources"] }
      if (pendingRef.current?.id !== turn.id) return null
      if (!response.ok || !body.reply || body.available === false) {
        setError([...(body.notices ?? []), body.error ?? "Angel couldn't respond. Your message is still pending; retry when ready."].join(" "))
        return null
      }
      const reply: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: body.reply, notices: body.notices, resources: body.resources }
      messagesRef.current = [...messagesRef.current, { id: turn.id, role: "user", content: turn.content }, reply]
      setMessages(messagesRef.current)
      pendingRef.current = finishAngelAttempt(pendingRef.current, turn.id, true)
      setPending(pendingRef.current)
      return speakableText(body.notices, [body.reply, spokenResourceSummary(body.resources)].filter(Boolean).join(" "))
    } catch {
      if (pendingRef.current?.id === turn.id) setError("No response confirmed. Your message is still pending. Check your connection and retry when ready.")
      return null
    } finally {
      if (requestRef.current === controller) {
        pendingRef.current = finishAngelAttempt(pendingRef.current, turn.id, false)
        setPending(pendingRef.current)
        setBusy(false)
      }
    }
  }

  useEffect(() => {
    // Read after mount so the server render and hydration agree.
    const remember = readRememberChoice(window.localStorage)
    const saved = remember ? readSavedPlace(window.localStorage) : null
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from device storage */
    setRememberPlace(remember)
    if (saved && "zip" in saved) setZip(saved.zip)
    else if (saved) { locationRef.current = saved; setLocation(saved) }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    if (rememberPlace && /^\d{5}$/.test(zip)) savePlace(window.localStorage, { zip })
  }, [zip, rememberPlace])

  useEffect(() => {
    let cancelled = false
    fetch("/api/angel", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { available?: boolean; provider?: string | null; privacy?: string | null; strictPrivacy?: boolean }) => {
        if (cancelled) return
        setAvailabilityFailed(false)
        setAvailable(Boolean(body.available))
        setProvider(body.provider ?? null)
        setPrivacy(body.privacy ?? null)
        setStrictPrivacy(body.strictPrivacy === true)
      })
      .catch(() => { if (!cancelled) setAvailabilityFailed(true) })
    return () => { cancelled = true }
  }, [availabilityAttempt])

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }) }, [messages])

  /** Asks the browser for the current position once; resolves with a spoken confirmation. */
  const shareLocation = (): Promise<string> => new Promise((resolve) => {
    const generation = ++locationGenerationRef.current
    if (!("geolocation" in navigator)) { setLocationNote("This browser can't share a location. Type a ZIP code instead."); resolve("This browser can't share a location. Say or type your ZIP code instead."); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (generation !== locationGenerationRef.current) { resolve("Location sharing was cancelled."); return }
        const rounded = { lat: coarsen(position.coords.latitude), lon: coarsen(position.coords.longitude) }
        locationRef.current = rounded
        setLocation(rounded)
        if (readRememberChoice(window.localStorage)) savePlace(window.localStorage, rounded)
        // The location the person just chose replaces any ZIP typed earlier.
        setZip("")
        setLocating(false)
        setLocationNote(undefined)
        resolve("Got it. I'll search near you.")
      },
      () => {
        if (generation !== locationGenerationRef.current) { resolve("Location sharing was cancelled."); return }
        setLocating(false)
        setLocationNote("Location was not shared. You can type a ZIP code instead.")
        resolve("Location was not shared. Say or type your ZIP code instead.")
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 600_000 },
    )
  })

  /** The latest request for places that has not been answered with listings yet, e.g. one asked before a location was shared. */
  const pendingSearch = () => {
    const history = messagesRef.current
    const lastAsk = history.findLastIndex((m) => m.role === "user" && routeAngelTurn(m.content).task === "resource")
    if (lastAsk < 0) return undefined
    const answered = history.slice(lastAsk + 1).some((m) => m.role === "assistant" && m.resources)
    return answered ? undefined : history[lastAsk].content
  }

  const forgetLocation = () => { locationGenerationRef.current++; invalidatePendingContext(); locationRef.current = null; setLocation(null); setLocationNote(undefined); setLocating(false); setZip(""); forgetPlace(window.localStorage) }
  const toggleRemember = (remember: boolean) => { setRememberPlace(remember); saveRememberChoice(window.localStorage, remember) }

  /** Sends a message and returns what Angel should say back (safety notices first), or null on failure. */
  const send = async (text: string): Promise<string | null> => {
    const content = text.trim()
    if (!content || busy) return null
    if (content.length > 2000) {
      setInput(text)
      setError("This draft is over 2,000 characters. Shorten it before sending. Nothing was sent.")
      return null
    }
    const local = parseAngelLocalCommand(content)
    if (local?.type === "navigate") {
      router.push(local.href)
      return `Opening ${local.href === "/stability" ? "your needs planner" : local.href === "/daily-life" ? "Daily Life" : local.href === "/ar" ? "training" : "help"}.`
    }
    if (local?.type === "clear") {
      clearConversation()
      return "Conversation cleared."
    }
    if (local?.type === "read_aloud" && voiceEnabled) {
      if (local.enabled) voice.primeSpeech()
      else voice.cancelSpeech()
      setReadAloud(local.enabled)
      return local.enabled ? "Read aloud is on." : "Read aloud is off."
    }
    if (local?.type === "location") {
      if (!local.enabled) { forgetLocation(); return "I stopped using your location." }
      const said = await shareLocation()
      const pending = pendingSearch()
      if (!locationRef.current || !pending) return said
      return `${said} ${(await send(pending)) ?? ""}`.trim()
    }
    if (pendingRef.current) return null
    // A ZIP said or typed in the message becomes the search area for this and later chats.
    const statedZip = zipFromMessage(content)
    if (statedZip && statedZip !== zip) setZip(statedZip)
    const travel = readTravel(window.localStorage)
    const travelZip = travel ? effectiveZip(travel, new Date().toISOString()) : { zip: "", inTravel: false }
    const searchZip = travelZip.inTravel ? travelZip.zip : (statedZip ?? zip)
    const next: ChatMessage[] = [...messagesRef.current, { id: crypto.randomUUID(), role: "user", content }]
    setInput("")
    setError(undefined)
    let localContext
    if (usePlanningContext) {
      const now = new Date()
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      const context = buildAngelLocalContext(
        readDailyLifeState(window.localStorage),
        readLifeSupportState(window.localStorage),
        readResourcePreferences(window.localStorage),
        date,
      )
      if (angelContextHasContent(context)) localContext = context
    }
    const turn: AngelPendingTurn = {
      id: next[next.length - 1].id, content, status: "pending",
      body: JSON.stringify({
        messages: next.slice(-20).map(({ role, content: body }) => ({ role, content: body.slice(0, 2000) })),
        ...(/^\d{5}$/.test(searchZip) ? { zip: searchZip } : locationRef.current ? { location: locationRef.current } : {}),
        ...(localContext ? { localContext } : {}),
      }),
    }
    pendingRef.current = turn
    setPending(turn)
    return attemptPending()
  }

  const stopHandsFree = (note?: string) => {
    handsFreeRef.current = false
    setHandsFree(false)
    voice.stopListening()
    if (note) setVoiceNote(note)
  }

  /** One voice turn: listen, send, and read the answer aloud. Repeats while hands-free is on. */
  const talk = async (alwaysSpeak: boolean) => {
    let quietTurns = 0
    do {
      setVoiceNote(undefined)
      const heard = await voice.listen()
      if ("cancelled" in heard) return
      if ("error" in heard) {
        if (heard.error === "no-speech" && handsFreeRef.current && ++quietTurns < 3) continue
        if (isFatalRecognitionError(heard.error)) stopHandsFree("Microphone access was not allowed. You can still type.")
        else stopHandsFree(heard.error === "no-speech" ? "I didn't hear anything, so I stopped listening. Tap Talk to try again." : "Listening stopped. Tap Talk to try again.")
        return
      }
      quietTurns = 0
      const answer = await send(heard.text)
      if (pendingRef.current) stopHandsFree("Message pending. Retry or cancel it below before continuing.")
      if (answer && (alwaysSpeak || readAloud || handsFreeRef.current)) await voice.speak(answer)
    } while (handsFreeRef.current)
  }

  const startTalking = () => {
    voice.primeSpeech()
    void talk(false)
  }

  const toggleHandsFree = () => {
    if (handsFreeRef.current) { stopHandsFree(); voice.cancelSpeech(); return }
    voice.primeSpeech()
    handsFreeRef.current = true
    setHandsFree(true)
    void talk(true)
  }

  return (
    <HolographicCard className={`p-6 flex flex-col gap-4 ${compact ? "" : "min-h-[520px]"}`} glowIntensity="medium">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary to-purple-500 flex items-center justify-center" aria-hidden="true">
          <Sparkles className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold font-orbitron">ANGEL AI</h3>
          <p className="text-xs text-muted-foreground">Your lifeline assistant, guardian and resource finder</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Angel is not an emergency service and cannot see your vitals or contact anyone. If someone may be overdosing, call{" "}
        <a className="underline" href="tel:911">911</a>. In a crisis, call or text <a className="underline" href="tel:988">988</a>.
      </p>

      {available === null && !availabilityFailed && <p className="text-sm text-muted-foreground" role="status">Checking whether Angel is available…</p>}
      {availabilityFailed && <div className="space-y-2 text-sm"><p role="status">Angel&apos;s availability could not be checked. Check your connection and try again.</p><Button type="button" variant="outline" disabled={!online} onClick={() => { setAvailabilityFailed(false); setAvailabilityAttempt((attempt) => attempt + 1) }}>Check Angel availability</Button></div>}
      {available === false && error && (
        // Safety notices for a message sent just before Angel turned out to be unavailable stay visible.
        <p className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm font-semibold" role="alert">{error}</p>
      )}
      {available === false && (
        <p className="text-sm" role="status" data-testid="angel-unavailable">
          Angel AI is not switched on yet. You can still <Link className="underline text-primary" href="/angel#nearby-heading">search for help near you</Link>.
        </p>
      )}

      {available && !consented && (
        <div className="space-y-3 rounded-lg border p-4" data-testid="angel-consent">
          <p className="text-sm">
            {angelProviderDisclosure(provider, privacy, strictPrivacy)}{" "}
            If you use voice, your browser turns speech into text (Apple or Google may process the audio), and replies are read aloud on this device.{" "}
            If you tap Use my location, it is rounded to about 1 km and used only to search public directories. It is never sent to the AI provider or stored on our servers; this phone remembers it (or your ZIP) so you only enter it once, until you turn that off or tap Forget.{" "}
            NarcoGuard does not save your chat, and it disappears when you leave this page. Don&apos;t include names, addresses or other details that identify you.
          </p>
          <Button onClick={() => setConsented(true)}>I understand, talk to Angel</Button>
        </div>
      )}

      {available && consented && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <Button key={suggestion} type="button" size="sm" variant="outline" disabled={busy || !!pending} onClick={() => void send(suggestion).then((answer) => { if (answer && readAloud) void voice.speak(answer) })}>{suggestion}</Button>
              ))}
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearConversation} disabled={messages.length === 0 && !pending && !input}>Clear conversation</Button>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-background/20 p-3">
            {voiceEnabled && (voice.sttSupported || voice.ttsSupported) && (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Voice">
                {voice.sttSupported && (
                  <Button type="button" variant={voice.listening && !handsFree ? "default" : "outline"} disabled={busy || handsFree || !!pending} onClick={voice.listening ? voice.stopListening : startTalking}>
                    {voice.listening && !handsFree ? <MicOff className="w-4 h-4 mr-2" aria-hidden="true" /> : <Mic className="w-4 h-4 mr-2" aria-hidden="true" />}
                    {voice.listening && !handsFree ? "Stop" : "Talk"}
                  </Button>
                )}
                {voice.sttSupported && voice.ttsSupported && (
                  <Button type="button" variant={handsFree ? "default" : "outline"} disabled={!!pending && !handsFree} aria-pressed={handsFree} onClick={toggleHandsFree}>
                    {handsFree ? "End hands-free" : "Hands-free conversation"}
                  </Button>
                )}
                {voice.ttsSupported && (
                  <Button type="button" variant="outline" aria-pressed={readAloud} onClick={() => { if (readAloud) voice.cancelSpeech(); else voice.primeSpeech(); setReadAloud(!readAloud) }}>
                    {readAloud ? <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> : <VolumeX className="w-4 h-4 mr-2" aria-hidden="true" />}
                    {readAloud ? "Reading replies aloud" : "Read replies aloud"}
                  </Button>
                )}
                <p className="w-full text-sm text-muted-foreground" role="status" aria-live="polite">
                  {voice.listening ? (voice.interim ? `Hearing: ${voice.interim}` : "Listening…") : voice.speaking ? "Angel is speaking…" : voiceNote ?? (handsFree ? "Hands-free is on." : "")}
                </p>
              </div>
            )}
            {!voiceEnabled && <p className="text-xs text-muted-foreground">Voice controls are off in setup preferences. Text chat still works.</p>}

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={usePlanningContext} onChange={(event) => { invalidatePendingContext(); setUsePlanningContext(event.target.checked) }} />
              <span><strong>Use my local planning context for this chat.</strong> Angel may receive my top goal, constraints, upcoming schedule, enabled routines, transport choices, and resource preferences. Journal text and my personal crisis-plan text are never included. Nothing is sent unless I turn this on.</span>
            </label>

            <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Search location">
              <Input aria-label="ZIP code for searches (optional)" inputMode="numeric" maxLength={5} value={zip} onChange={(event) => { invalidatePendingContext(); setZip(event.target.value.replace(/\D/g, "")) }} placeholder="ZIP (optional)" className="w-32" />
              {location ? (
                <>
                  <span data-testid="angel-location-on">Searching near you (location rounded to about 1 km).</span>
                  <Button type="button" variant="ghost" size="sm" onClick={forgetLocation}>Stop using my location</Button>
                </>
              ) : (
                <Button type="button" variant="outline" size="sm" disabled={locating || busy || !!pending} onClick={() => void shareLocation().then(() => {
                  const pending = locationRef.current ? pendingSearch() : undefined
                  if (pending) void send(pending).then((answer) => { if (answer && readAloud) void voice.speak(answer) })
                })}>
                  <LocateFixed className="w-4 h-4 mr-2" aria-hidden="true" />{locating ? "Finding your location…" : "Use my location"}
                </Button>
              )}
              {locationNote && <span className="text-muted-foreground" role="status">{locationNote}</span>}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="angel-remember-place">
              <label className="inline-flex min-h-11 items-center gap-2">
                <input type="checkbox" checked={rememberPlace} onChange={(event) => toggleRemember(event.target.checked)} />
                Remember my ZIP or approximate location on this phone
              </label>
              {(zip || location) && (
                <Button type="button" variant="ghost" size="sm" onClick={forgetLocation} data-testid="angel-forget-place">Forget where I am</Button>
              )}
            </div>
          </div>

          {error && <p className="text-sm" role="alert">{error}</p>}
          {!online && <p className="text-sm" role="status">You are offline. Angel messages stay on this page until you choose to retry. Emergency calls use your phone connection.</p>}
          {pending && (
            <div className="space-y-2 rounded-lg border p-3 text-sm" data-testid="angel-pending">
              <p className="whitespace-pre-wrap">{pending.content}</p>
              <p role="status">{pending.status === "sending" ? "Sending — waiting for Angel's response." : "Pending — no response confirmed. Kept only in this page's memory; leaving or reloading removes it. Nothing sends automatically."}</p>
              <Button type="button" variant="outline" disabled={!online || busy} onClick={() => void attemptPending().then((answer) => { if (answer && readAloud) void voice.speak(answer) })}>Retry message</Button>
              <Button type="button" variant="ghost" onClick={cancelPending}>Cancel pending message</Button>
            </div>
          )}

          <div
            className="flex-1 space-y-3 overflow-y-auto min-h-64 max-h-[55vh] rounded-xl border border-border/60 bg-background/30 p-3 sm:p-4"
            aria-live="polite"
            aria-label="Conversation with Angel"
            data-testid="angel-chat-history"
          >
            {messages.length === 0 && <p className="text-sm text-muted-foreground">Hi, I&apos;m Angel. I can help you find nearby help or plan a next step toward a goal. What would help right now?</p>}
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "space-y-2"}>
                {message.notices?.map((notice) => (
                  <p key={notice} className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm font-semibold" role="alert">{notice}</p>
                ))}
                {message.content && (
                  <p className={`max-w-[85%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "glass"}`}>{message.content}</p>
                )}
                {message.resources && (
                  <div className="space-y-3 text-sm" data-testid="angel-resources">
                    {message.resources.message && <p className="text-muted-foreground">{message.resources.message}</p>}
                    {message.resources.groups.map((group) => (
                      <section key={group.kind} aria-label={group.shortLabel} className="space-y-2">
                        <h4 className="font-semibold">{group.label}</h4>
                        {group.widenedMiles && group.results.length > 0 && <p className="text-xs text-muted-foreground">Nothing within 10 miles, so this searched up to {group.widenedMiles} miles.</p>}
                        {group.results.length > 0 ? (
                          <ul className="space-y-2">
                            {group.results.map((resource) => (
                              <li key={`${resource.name}-${resource.lat}-${resource.lon}`} className="rounded-lg border p-2">
                                <strong>{resource.name}</strong>{resource.distanceMiles !== undefined && ` · ${resource.distanceMiles} mi`}
                                {resource.address && <span className="block text-muted-foreground">{resource.address}</span>}
                                {resource.phone && <a className="underline text-primary" href={`tel:${resource.phone.replace(/[^\d+]/g, "")}`}>Call {resource.phone}</a>}
                                <span className="block text-xs text-muted-foreground">Source: {resource.source}. Call first to confirm.</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">
                            {group.status === "ok" ? "No listing found nearby." : "This search is not available right now."}{" "}
                            {group.fallback.map((link) => <a key={link.url} className="underline text-primary mr-2" href={link.url} target="_blank" rel="noreferrer">{link.title}</a>)}
                            <a className="underline text-primary" href="tel:211">Call 211</a>
                          </p>
                        )}
                      </section>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-sm text-muted-foreground" role="status">Angel is thinking…</p>}
            <div ref={endRef} />
          </div>

          <form
            className="sticky bottom-2 z-10 rounded-2xl border border-border/70 bg-background/95 p-2 shadow-lg backdrop-blur"
            data-testid="angel-composer"
            onSubmit={(event) => { event.preventDefault(); void send(input).then((answer) => { if (answer && readAloud) void voice.speak(answer) }) }}
          >
            <div className="flex items-end gap-2">
              <Textarea
                aria-label="Message Angel"
                maxLength={2000}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    if (!busy && input.trim()) event.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder="Message Angel…"
                rows={2}
                className="min-h-12 max-h-36 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button type="submit" disabled={busy || !!pending || !input.trim()} aria-label="Send message" size="icon">
                <Send className="w-4 h-4" aria-hidden="true" />
              </Button>
            </div>
            <p className="px-2 pt-1 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
          </form>
        </>
      )}
    </HolographicCard>
  )
}
