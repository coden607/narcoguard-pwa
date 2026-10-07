"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { LocateFixed, Mic, MicOff, Send, Sparkles, Volume2, VolumeX } from "lucide-react"
import { HolographicCard } from "@/components/effects/holographic-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  notices?: string[]
  resources?: AngelResources
}

const SUGGESTIONS = ["Help me set a goal for this week", "Find food and a place to sleep near me", "How do I get naloxone?"]

export function AngelAI({ compact = false }: { compact?: boolean }) {
  const router = useRouter()
  const preferences = useUserPreferences()
  const voiceEnabled = preferences?.features.voiceActivation ?? true
  // Conversations live only in this component's memory; nothing is saved to the device or server.
  const [available, setAvailable] = useState<boolean | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
  const [consented, setConsented] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [zip, setZip] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()
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
  const [locating, setLocating] = useState(false)
  const [locationNote, setLocationNote] = useState<string>()

  useEffect(() => { messagesRef.current = messages }, [messages])

  useEffect(() => {
    let cancelled = false
    fetch("/api/angel", { cache: "no-store" })
      .then((response) => response.json())
      .then((body: { available?: boolean; provider?: string | null }) => {
        if (cancelled) return
        setAvailable(Boolean(body.available))
        setProvider(body.provider ?? null)
      })
      .catch(() => { if (!cancelled) setAvailable(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }) }, [messages])

  /** Asks the browser for the current position once; resolves with a spoken confirmation. */
  const shareLocation = (): Promise<string> => new Promise((resolve) => {
    if (!("geolocation" in navigator)) { setLocationNote("This browser can't share a location. Type a ZIP code instead."); resolve("This browser can't share a location. Say or type your ZIP code instead."); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const rounded = { lat: coarsen(position.coords.latitude), lon: coarsen(position.coords.longitude) }
        locationRef.current = rounded
        setLocation(rounded)
        setLocating(false)
        setLocationNote(undefined)
        resolve("Got it. I'll search near you.")
      },
      () => {
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

  const forgetLocation = () => { locationRef.current = null; setLocation(null); setLocationNote(undefined) }

  /** Sends a message and returns what Angel should say back (safety notices first), or null on failure. */
  const send = async (text: string): Promise<string | null> => {
    const content = text.trim()
    if (!content || busy) return null
    const local = parseAngelLocalCommand(content)
    if (local?.type === "navigate") {
      router.push(local.href)
      return `Opening ${local.href === "/stability" ? "your needs planner" : local.href === "/daily-life" ? "Daily Life" : local.href === "/ar" ? "training" : "help"}.`
    }
    if (local?.type === "clear") {
      messagesRef.current = []
      setMessages([])
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
    const next: ChatMessage[] = [...messagesRef.current, { id: crypto.randomUUID(), role: "user", content }]
    messagesRef.current = next
    setMessages(next)
    setInput("")
    setBusy(true)
    setError(undefined)
    try {
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
      const response = await fetch("/api/angel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-20).map(({ role, content: body }) => ({ role, content: body.slice(0, 2000) })),
          ...(/^\d{5}$/.test(zip) ? { zip } : locationRef.current ? { location: locationRef.current } : {}),
          ...(localContext ? { localContext } : {}),
        }),
      })
      const body = (await response.json()) as { available?: boolean; reply?: string; error?: string; notices?: string[]; resources?: ChatMessage["resources"] }
      if (body.available === false) {
        // The provider is not set up; fall back to the "not switched on" state with the search link.
        if (body.notices?.length) setError(body.notices.join(" "))
        handsFreeRef.current = false
        setHandsFree(false)
        setAvailable(false)
        return body.notices?.length ? speakableText(body.notices, "") : null
      }
      if (body.notices?.length || body.reply) {
        const reply: ChatMessage = { id: crypto.randomUUID(), role: "assistant", content: body.reply ?? "", notices: body.notices, resources: body.resources }
        messagesRef.current = [...messagesRef.current, reply]
        setMessages(messagesRef.current)
      }
      if (!response.ok || !body.reply) {
        const message = body.error ?? "Angel couldn't respond right now."
        setError(message)
        return speakableText(body.notices, message)
      }
      return speakableText(body.notices, [body.reply, spokenResourceSummary(body.resources)].filter(Boolean).join(" "))
    } catch {
      setError("Angel couldn't be reached. Check your connection.")
      return null
    } finally {
      setBusy(false)
    }
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

      {available === null && <p className="text-sm text-muted-foreground" role="status">Checking whether Angel is available…</p>}
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
            {provider === "Vercel AI Gateway"
              ? "Your messages are sent through Vercel AI Gateway to Groq, an AI provider, to write Angel's replies. Groq says it does not train on them."
              : provider === "OpenRouter"
              ? "Your messages are sent through OpenRouter to an AI provider to write Angel's replies. NarcoGuard asks OpenRouter to use only providers that do not store or train on them."
              : "Your messages are sent to Groq, an AI provider, to write Angel's replies. Groq says it does not train on them."}{" "}
            If you use voice, your browser turns speech into text (Apple or Google may process the audio), and replies are read aloud on this device.{" "}
            If you tap Use my location, it is rounded to about 1 km and used only to search public directories. It is never sent to the AI provider and is not saved.{" "}
            NarcoGuard does not save your chat, and it disappears when you leave this page. Don&apos;t include names, addresses or other details that identify you.
          </p>
          <Button onClick={() => setConsented(true)}>I understand, talk to Angel</Button>
        </div>
      )}

      {available && consented && (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto max-h-96" aria-live="polite" aria-label="Conversation with Angel">
            {messages.length === 0 && <p className="text-sm text-muted-foreground">Hi, I&apos;m Angel. I can help you find nearby help or plan a next step toward a goal. What would help right now?</p>}
            {messages.map((message) => (
              <div key={message.id} className={message.role === "user" ? "flex justify-end" : "space-y-2"}>
                {message.notices?.map((notice) => (
                  <p key={notice} className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm font-semibold" role="alert">{notice}</p>
                ))}
                {message.content && (
                  <p className={`max-w-[85%] whitespace-pre-wrap rounded-lg p-3 text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "glass"}`}>{message.content}</p>
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
          {error && <p className="text-sm" role="status">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
              <Button key={suggestion} type="button" size="sm" variant="outline" disabled={busy} onClick={() => void send(suggestion).then((answer) => { if (answer && readAloud) void voice.speak(answer) })}>{suggestion}</Button>
            ))}
          </div>
          {voiceEnabled && (voice.sttSupported || voice.ttsSupported) && (
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Voice">
              {voice.sttSupported && (
                <Button type="button" variant={voice.listening && !handsFree ? "default" : "outline"} disabled={busy || handsFree} onClick={voice.listening ? voice.stopListening : startTalking}>
                  {voice.listening && !handsFree ? <MicOff className="w-4 h-4 mr-2" aria-hidden="true" /> : <Mic className="w-4 h-4 mr-2" aria-hidden="true" />}
                  {voice.listening && !handsFree ? "Stop" : "Talk"}
                </Button>
              )}
              {voice.sttSupported && voice.ttsSupported && (
                <Button type="button" variant={handsFree ? "default" : "outline"} aria-pressed={handsFree} onClick={toggleHandsFree}>
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
          <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            <input type="checkbox" checked={usePlanningContext} onChange={(event) => setUsePlanningContext(event.target.checked)} />
            <span><strong>Use my local planning context for this chat.</strong> Angel may receive my top goal, constraints, upcoming schedule, enabled routines, transport choices, and resource preferences. Journal text and my personal crisis-plan text are never included. Nothing is sent unless I turn this on.</span>
          </label>
          <form className="flex flex-col sm:flex-row gap-2" onSubmit={(event) => { event.preventDefault(); void send(input).then((answer) => { if (answer && readAloud) void voice.speak(answer) }) }}>
            <Input aria-label="Message Angel" maxLength={2000} value={input} onChange={(event) => setInput(event.target.value)} placeholder="Type a message" className="flex-1" />
            <Input aria-label="ZIP code for searches (optional)" inputMode="numeric" maxLength={5} value={zip} onChange={(event) => setZip(event.target.value.replace(/\D/g, ""))} placeholder="ZIP (optional)" className="sm:w-32" />
            <Button type="submit" disabled={busy || !input.trim()} aria-label="Send message"><Send className="w-4 h-4" aria-hidden="true" /></Button>
          </form>
          <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Search location">
            {location ? (
              <>
                <span data-testid="angel-location-on">Searching near you (location rounded to about 1 km).</span>
                <Button type="button" variant="ghost" size="sm" onClick={forgetLocation}>Stop using my location</Button>
              </>
            ) : (
              <Button type="button" variant="outline" size="sm" disabled={locating || busy} onClick={() => void shareLocation().then(() => {
                const pending = locationRef.current ? pendingSearch() : undefined
                if (pending) void send(pending).then((answer) => { if (answer && readAloud) void voice.speak(answer) })
              })}>
                <LocateFixed className="w-4 h-4 mr-2" aria-hidden="true" />{locating ? "Finding your location…" : "Use my location"}
              </Button>
            )}
            {locationNote && <span className="text-muted-foreground" role="status">{locationNote}</span>}
          </div>
          <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setMessages([])}>Clear conversation</Button>
        </>
      )}
    </HolographicCard>
  )
}
