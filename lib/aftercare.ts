// After naloxone is given (issue #265). NEEDS CLINICAL REVIEW before it is relied on.
// Wording follows public sources, reviewed 2026-11-02:
// - CDC, "Lifesaving Naloxone": naloxone can restore breathing within 2-3 minutes; more than one
//   dose may be needed with fentanyl; stay with the person until help arrives or for at least
//   four hours; Good Samaritan laws in most states.
// - SAMHSA, Overdose Prevention and Response Toolkit (PEP23-03-00-001): naloxone wears off in
//   30 to 90 minutes, so an overdose can return; recovery position; withdrawal after naloxone.
// - CDC, "What you should know about xylazine": xylazine effects can continue after naloxone;
//   rescue breaths and the recovery position.
// General information, not medical advice. Call 911 and follow the dispatcher.

export const AFTERCARE_REVIEWED = "2026-11-02"

export interface AftercareStep {
  title: string
  detail: string
}

export const AFTERCARE_STEPS: AftercareStep[] = [
  { title: "Keep 911 coming, even if they wake up", detail: "Naloxone can wear off in 30 to 90 minutes, sooner than many opioids. The overdose can come back, so they still need medical care." },
  { title: "Stay with them", detail: "Stay until help arrives. If they won't go to a hospital, stay for at least 4 hours and keep checking their breathing." },
  { title: "Breathing but not awake? Put them on their side", detail: "Roll them onto their side, top knee bent, hand under their head, so they won't choke if they vomit." },
  { title: "Breathing slows or stops again?", detail: "Give another dose of naloxone in the other nostril and give rescue breaths: one breath every 5 seconds. Tell 911." },
  { title: "Expect withdrawal and be kind", detail: "They may wake up sick, upset or confused. Tell them calmly what happened. Using more now is very risky: when naloxone wears off, the overdose can come back stronger." },
  { title: "Xylazine (tranq) may be involved", detail: "They may stay sleepy even after naloxone works on the opioid. Keep checking breathing and keep them on their side." },
]

export const RESTOCK_STEPS: string[] = [
  "Replace the naloxone you used today, and any that is expired.",
  "Keep at least two doses together: fentanyl overdoses can need more than one.",
  "Tell the people around you where your naloxone is kept.",
]

export const GOOD_SAMARITAN_NOTE =
  "Most states have Good Samaritan laws that protect people who call 911 for an overdose, and the person who overdosed, from some drug charges. What is covered differs by state."

export const AFTERCARE_SOURCES = [
  { title: "CDC: Lifesaving naloxone", url: "https://www.cdc.gov/stop-overdose/caring/naloxone.html" },
  { title: "SAMHSA: Overdose prevention and response toolkit", url: "https://library.samhsa.gov/product/overdose-prevention-response-toolkit/pep23-03-00-001" },
  { title: "CDC: What you should know about xylazine", url: "https://www.cdc.gov/overdose-prevention/about/what-you-should-know-about-xylazine.html" },
]
