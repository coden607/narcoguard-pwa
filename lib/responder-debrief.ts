// Responder debrief (issue #275). On-device only: the check-in answer lives in page state and is
// gone when the page closes. Nothing is saved, logged or sent. Sources, reviewed 2026-11-02:
// - SAMHSA Disaster Distress Helpline (1-800-985-5990, call or text): support after a
//   traumatic event.
// - 988 Suicide & Crisis Lifeline (call or text 988).

export const DEBRIEF_REVIEWED = "2026-11-02"

export type DebriefFeeling = "okay" | "shaken" | "overwhelmed"

export const DEBRIEF_FEELINGS: { id: DebriefFeeling; label: string }[] = [
  { id: "okay", label: "I'm okay" },
  { id: "shaken", label: "Shaken up" },
  { id: "overwhelmed", label: "Overwhelmed" },
]

export const DEBRIEF_SUGGESTIONS: Record<DebriefFeeling, string[]> = {
  okay: [
    "Feeling okay is normal too. Reactions can show up later, sometimes days later.",
    "Restock your naloxone so you are ready next time.",
  ],
  shaken: [
    "Shaking, crying, feeling numb or replaying it are common after an emergency.",
    "Drink some water, eat something, and slow your breathing for a minute.",
    "Talk to someone you trust, or text or call a counselor.",
  ],
  overwhelmed: [
    "You don't have to handle this alone. Reach out to a counselor now: call or text 988, or the Disaster Distress Helpline.",
    "If you are thinking about hurting yourself, call or text 988 now.",
  ],
}

export const DEBRIEF_LINES = [
  { name: "988 Suicide & Crisis Lifeline", tel: "988", sms: "988", display: "988", what: "Call or text, 24/7, free and confidential." },
  { name: "Disaster Distress Helpline", tel: "18009855990", sms: "18009855990", display: "1-800-985-5990", what: "SAMHSA's line for anyone upset after a traumatic event. Call or text, 24/7." },
]

export const DEBRIEF_SOURCES = [
  { title: "SAMHSA: Disaster Distress Helpline", url: "https://www.samhsa.gov/find-help/helplines/disaster-distress-helpline" },
  { title: "988 Suicide & Crisis Lifeline", url: "https://988lifeline.org/" },
]

export function suggestionsFor(feeling: DebriefFeeling | null): string[] {
  return feeling ? DEBRIEF_SUGGESTIONS[feeling] : []
}
