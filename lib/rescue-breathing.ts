// Rescue-breathing metronome (issue #274). NEEDS CLINICAL REVIEW.
// Source, reviewed 2026-11-02: CDC, "What you should know about xylazine": clear the airway, tilt
// the head back, pinch the nose, seal your mouth over theirs, give two slow breaths, watch the
// chest (not the stomach) rise, then one breath every 5 seconds. SAMHSA Overdose Prevention and
// Response Toolkit gives the same adult rate. General information, not medical advice.

export const BREATH_INTERVAL_MS = 5_000
export const RESCUE_BREATHING_REVIEWED = "2026-11-02"

export const RESCUE_BREATHING_SETUP: string[] = [
  "Call 911 first, or put the phone on speaker and have someone else call.",
  "Give naloxone if you have it.",
  "Lay them on their back. Tilt the head back and lift the chin. Check nothing is in the mouth.",
  "Pinch the nose closed, seal your mouth over theirs, and give 2 slow breaths. Watch the chest rise.",
  "Then give 1 breath each time the circle pulses: one every 5 seconds.",
  "If they start breathing on their own, roll them onto their side and stay with them.",
]

export const RESCUE_BREATHING_SOURCES = [
  { title: "CDC: What you should know about xylazine (rescue breaths)", url: "https://www.cdc.gov/overdose-prevention/about/what-you-should-know-about-xylazine.html" },
  { title: "SAMHSA: Overdose prevention and response toolkit", url: "https://library.samhsa.gov/product/overdose-prevention-response-toolkit/pep23-03-00-001" },
]

/** Breaths cued so far, counting the cue at the start, for a run that began `elapsedMs` ago. */
export function breathsCued(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return 0
  return Math.floor(elapsedMs / BREATH_INTERVAL_MS) + 1
}

/** Milliseconds until the next cue. */
export function msUntilNextBreath(elapsedMs: number): number {
  if (!Number.isFinite(elapsedMs) || elapsedMs < 0) return BREATH_INTERVAL_MS
  return BREATH_INTERVAL_MS - (elapsedMs % BREATH_INTERVAL_MS)
}
