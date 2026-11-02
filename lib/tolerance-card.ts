// "Coming back after a break" tolerance card (issue #266). NEEDS CLINICAL REVIEW.
// Stores nothing. Wording follows public sources, reviewed 2026-11-02:
// - SAMHSA, Overdose Prevention and Response Toolkit: overdose risk rises after a period of
//   reduced use or abstinence (detox, treatment, incarceration, hospital) because tolerance falls.
// - NIDA, "Naloxone DrugFacts" and CDC "Preventing opioid overdose": never use alone, carry naloxone.
// - Binswanger et al., NEJM 2007 (cited by NIDA): overdose death risk is highest in the first
//   weeks after release from prison.

export const TOLERANCE_REVIEWED = "2026-11-02"

export const TOLERANCE_INTRO =
  "Back from jail, prison, detox, rehab or a hospital stay? Even a few days off lowers your tolerance. The amount you used before can now stop your breathing."

export const TOLERANCE_TIPS: string[] = [
  "The first weeks back are when overdose risk is highest.",
  "If you use, start with much less than you used to, and go slow.",
  "The supply may have changed while you were away, often with fentanyl or xylazine in it. Test strips can help.",
  "Don't use alone. Have someone with naloxone nearby, or call Never Use Alone.",
  "Keep naloxone where people can see it, and tell them where it is.",
  "Treatment can start right away, including buprenorphine by video visit.",
]

export const TOLERANCE_SOURCES = [
  { title: "SAMHSA: Overdose prevention and response toolkit", url: "https://library.samhsa.gov/product/overdose-prevention-response-toolkit/pep23-03-00-001" },
  { title: "NIDA: Naloxone DrugFacts", url: "https://nida.nih.gov/publications/drugfacts/naloxone" },
]
