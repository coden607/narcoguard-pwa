// Voice for Angel uses the browser's built-in Web Speech engines: free, no API key, and available
// in Safari (iOS 14.5+), Chrome and Edge. Speech recognition is performed by the browser vendor
// (Apple or Google may process the audio); speech synthesis runs on the device.

export interface SpeechRecognitionResultLike { isFinal: boolean; 0: { transcript: string } }
export interface SpeechRecognitionEventLike { resultIndex: number; results: ArrayLike<SpeechRecognitionResultLike> }
export interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionLike

export function speechRecognitionCtor(win: unknown): SpeechRecognitionCtor | null {
  const w = win as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor } | undefined
  return w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null
}

/** Splits recognition results into the confirmed (final) text and the in-progress (interim) text. */
export function readTranscript(event: SpeechRecognitionEventLike): { final: string; interim: string } {
  let final = ""
  let interim = ""
  for (let i = event.resultIndex; i < event.results.length; i++) {
    const result = event.results[i]
    if (result.isFinal) final += result[0].transcript
    else interim += result[0].transcript
  }
  return { final: final.trim(), interim: interim.trim() }
}

/** Turns a reply into plain speech: safety notices first, without markdown symbols or raw links. */
export function speakableText(notices: string[] | undefined, reply: string): string {
  const cleaned = reply
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "the link on screen")
    .replace(/[*_#>`|~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return sayNumbersClearly([...(notices ?? []), cleaned].filter(Boolean).join(" "))
}

/** Some voices read "911" as "nine hundred eleven"; help lines are spoken digit by digit, and "mi" as miles. */
export function sayNumbersClearly(text: string): string {
  return text
    .replace(/\b(911|988|211)\b/g, (n) => n.split("").join(" "))
    .replace(/(\d) ?mi\b\.?/g, "$1 miles")
}

export interface VoiceLike {
  name: string
  lang: string
  localService?: boolean
  default?: boolean
}

const NATURAL_HINTS = /natural|neural|premium|enhanced|siri|samantha|\bava\b|allison|zoe|jenny|\baria\b|\bevan\b|nicky|karen|daniel|moira|tessa/i
const NOVELTY = /albert|bad news|good news|bahh|bells|boing|bubbles|cellos|jester|organ|superstar|trinoids|whisper|wobble|zarvox|deranged|hysterical|fred|junior|ralph|kathy|eloquence|compact|espeak/i

/** Picks the most natural-sounding on-device voice for the language; undefined means the browser default. */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], lang: string): T | undefined {
  const want = lang.toLowerCase()
  const base = want.split("-")[0]
  const score = (voice: T) => {
    const voiceLang = voice.lang.toLowerCase().replace("_", "-")
    if (!voiceLang.startsWith(base)) return -1
    if (NOVELTY.test(voice.name)) return -1
    // Remote voices (Chrome's Google voices, Edge's "Online" voices) send the text to the vendor; replies may be private.
    if (voice.localService === false) return -1
    let points = voiceLang === want ? 4 : 2
    if (NATURAL_HINTS.test(voice.name)) points += 5
    if (/premium|enhanced|natural|neural/i.test(voice.name)) points += 3
    if (voice.default) points += 1
    return points
  }
  let best: T | undefined
  let bestScore = 0
  for (const voice of voices) {
    const points = score(voice)
    if (points > bestScore) { best = voice; bestScore = points }
  }
  return best
}

/** Splits text into sentence-sized chunks; long single utterances are cut off on some mobile browsers. */
export function speechChunks(text: string, maxLength = 180): string[] {
  // Split only where punctuation is followed by a space, so "0.4 miles" and "Dr.Smith" stay whole.
  const sentences = text.split(/(?<=[.!?])\s+/)
  const chunks: string[] = []
  let current = ""
  for (const sentence of sentences.map((s) => s.trim()).filter(Boolean)) {
    if (sentence.length > maxLength) {
      if (current) { chunks.push(current); current = "" }
      for (let i = 0; i < sentence.length; i += maxLength) chunks.push(sentence.slice(i, i + maxLength).trim())
      continue
    }
    if (current && current.length + sentence.length + 1 > maxLength) { chunks.push(current); current = sentence }
    else current = current ? `${current} ${sentence}` : sentence
  }
  if (current) chunks.push(current)
  return chunks
}

/** Recognition errors that mean "stop trying" rather than "listen again". */
export function isFatalRecognitionError(error: string): boolean {
  return ["not-allowed", "service-not-allowed", "audio-capture", "language-not-supported"].includes(error)
}
