// Step-by-step response guides and self-paced lessons for /ar. General guidance only, following
// the SAMHSA Opioid Overdose Prevention Toolkit, the FDA Narcan nasal spray label and American Heart
// Association CPR guidance (rate 100–120/min, depth 2–2.4 in, full recoil, 30:2 if trained).
// Reviewed 2026-10-06. Steps advance only when the person taps Next; nothing here detects anything.

export type GuideMode = "naloxone" | "cpr"

export interface GuideStep {
  title: string
  body: string
  /** Optional on-screen tool for this step. */
  tool?: "second-dose-timer" | "metronome"
}

export const GUIDES: Record<GuideMode, { title: string; steps: GuideStep[] }> = {
  naloxone: {
    title: "Naloxone (opioid overdose)",
    steps: [
      { title: "Check if they respond", body: "Shout their name and rub hard on the middle of their chest with your knuckles. Look for slow, stopped or gurgling breathing, blue or gray lips, and tiny pupils." },
      { title: "Call 911", body: "Call 911 now, or have someone call, and say the person is not breathing or won't wake up. Put the phone on speaker and follow the dispatcher." },
      { title: "Give naloxone", body: "Lay them on their back. Put the nozzle fully into one nostril and press the plunger firmly once. The spray does not need priming." },
      { title: "Support breathing", body: "If you are trained, give rescue breaths: tilt the head back, lift the chin, pinch the nose and give one breath every 5 seconds. If they are not breathing normally and you cannot tell, start CPR.", tool: "second-dose-timer" },
      { title: "Second dose if needed", body: "No response after 2–3 minutes? Give another dose with a new device in the other nostril and keep supporting breathing." },
      { title: "Recovery position and stay", body: "If they breathe on their own, roll them onto their side with the top knee bent. Stay with them: naloxone can wear off in 30–90 minutes, before the opioid does." },
    ],
  },
  cpr: {
    title: "CPR (not breathing normally)",
    steps: [
      { title: "Call 911", body: "Call 911 or have someone call. Put the phone on speaker. If naloxone is nearby and opioids may be involved, have someone get it, but do not delay compressions." },
      { title: "Hand position", body: "Kneel beside them. Put the heel of one hand on the center of the chest (lower half of the breastbone), the other hand on top, arms straight, shoulders over your hands." },
      { title: "Push hard and fast", body: "Push at least 2 inches (5 cm) deep, no more than 2.4 inches, 100–120 times a minute, letting the chest come all the way back up. Follow the beat below.", tool: "metronome" },
      { title: "Breaths only if trained", body: "If you are trained and willing, give 2 rescue breaths after every 30 compressions. Otherwise keep doing hands-only compressions without stopping." },
      { title: "Keep going", body: "Continue until EMS takes over, an AED is ready, or the person starts breathing normally. Swap with someone every 2 minutes if you can; compressions get shallow when you tire." },
    ],
  },
}

export const METRONOME_BPM = 110
export const SECOND_DOSE_SECONDS = 180

export const beatIntervalMs = (bpm: number) => {
  if (!Number.isFinite(bpm) || bpm < 100 || bpm > 120) throw new RangeError("CPR rate must be 100–120 per minute")
  return Math.round(60_000 / bpm)
}

export const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds))
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`
}

export interface Lesson {
  id: string
  title: string
  minutes: number
  points: string[]
  check: { question: string; options: string[]; answer: number; why: string }
}

/** Self-paced practice lessons. Practice checks are not certification; the Hero test is graded on the server. */
export const LESSONS: Lesson[] = [
  {
    id: "recognize",
    title: "Recognize an opioid overdose",
    minutes: 3,
    points: [
      "Won't wake up to a shout or a hard knuckle rub on the breastbone.",
      "Slow, stopped, snoring or gurgling breathing.",
      "Blue or gray lips and fingertips; tiny (pinpoint) pupils.",
      "Check breathing for no more than 10 seconds. Gasping is not normal breathing.",
    ],
    check: { question: "Which signs most strongly suggest an opioid overdose?", options: ["Agitated with very large pupils", "Won't wake up, slow or no breathing, tiny pupils", "Awake with a headache"], answer: 1, why: "Unresponsiveness, slow or stopped breathing and pinpoint pupils are the classic signs." },
  },
  {
    id: "naloxone",
    title: "Give naloxone",
    minutes: 3,
    points: [
      "Call 911 first, or have someone call while you get naloxone.",
      "Nasal spray: nozzle fully into one nostril, press the plunger once. No priming.",
      "No response in 2–3 minutes: new device, other nostril.",
      "Naloxone does not harm someone who has no opioids in their body, so give it if you are unsure.",
    ],
    check: { question: "No response 2–3 minutes after the first dose. What now?", options: ["Wait 30 minutes", "Give a second dose with a new device in the other nostril", "Reuse the first device"], answer: 1, why: "Strong opioids like fentanyl can need more than one dose." },
  },
  {
    id: "breathing",
    title: "Breathing, CPR and recovery position",
    minutes: 4,
    points: [
      "Not breathing normally: start CPR. Do not delay CPR to find naloxone.",
      "Compressions: center of chest, 2–2.4 inches deep, 100–120 a minute, full recoil.",
      "Trained: 2 breaths after every 30 compressions. Untrained: hands-only.",
      "Breathing but not awake: recovery position on their side, top knee bent.",
    ],
    check: { question: "How fast should chest compressions be?", options: ["60–80 a minute", "100–120 a minute", "As fast as possible"], answer: 1, why: "The AHA rate is 100–120 compressions a minute." },
  },
  {
    id: "after",
    title: "After naloxone",
    minutes: 2,
    points: [
      "Naloxone lasts about 30–90 minutes; the overdose can return.",
      "They may wake up in withdrawal: sick, sweating, upset. Stay calm and explain what happened.",
      "Discourage using more opioids; stay until EMS arrives.",
      "An awake adult can refuse transport. Explain the risk and don't leave them alone if you can help it.",
    ],
    check: { question: "Why stay after the person wakes up?", options: ["Naloxone can wear off before the opioid does", "To collect their drugs", "There is no need to stay"], answer: 0, why: "Breathing can slow again when naloxone wears off." },
  },
  {
    id: "safety",
    title: "Your safety and their privacy",
    minutes: 2,
    points: [
      "Dangerous scene (weapons, fighting, traffic)? Stay back and tell 911.",
      "Brief skin contact with fentanyl or being in the room does not cause an overdose.",
      "Share only what EMS needs. No photos, posts or gossip.",
      "Most US states have Good Samaritan protections for people who call 911; details vary.",
    ],
    check: { question: "Can brief skin contact with fentanyl overdose a responder?", options: ["Yes, instantly", "No; wear gloves if you have them and wash with soap and water", "Only indoors"], answer: 1, why: "Toxicology societies found incidental contact does not cause overdose." },
  },
]

export const LESSON_PROGRESS_KEY = "narcoguard_lessons_v1"

export function parseProgress(raw: string | null): string[] {
  try {
    const value = JSON.parse(raw ?? "[]")
    return Array.isArray(value) ? value.filter((id): id is string => LESSONS.some((lesson) => lesson.id === id)) : []
  } catch {
    return []
  }
}
