// Pharmacy card for asking for naloxone (issue #270). Content only; nothing is stored or sent.
// Sources (reviewed 2026-11-02):
// - FDA, "Information about Naloxone and Nalmefene" (Narcan 4 mg nasal spray approved for
//   over-the-counter sale, March 2023).
// - CDC, "Lifesaving Naloxone" (anyone can carry it; pharmacies in every state can provide it).
// - SAMHSA, Overdose Prevention and Response Toolkit (standing orders and insurance coverage).
// Pharmacy rules, prices and coverage differ by state and plan, so the card asks rather than asserts.

export const PHARMACY_CARD_REVIEWED = "2026-11-02"

export const PHARMACY_CARD_LINES: string[] = [
  "Hi. I'd like to get naloxone (Narcan) nasal spray, please.",
  "The 4 mg nasal spray is sold over the counter, so I don't need a prescription for it.",
  "If you only have another form, can you give it to me under the state's naloxone standing order?",
  "Can it go through my insurance or Medicaid? If not, what is the cash price?",
  "Could you show me how to use it?",
]

export const PHARMACY_CARD_TIPS: string[] = [
  "You don't have to say who it's for or why.",
  "If this pharmacy doesn't have it, ask when it will be in, or try another pharmacy.",
  "Rules on prescription forms, standing orders and insurance differ by state, so the pharmacist may tell you something different. That's okay.",
  "Free naloxone is also available from many harm-reduction programs and by mail.",
]

export const PHARMACY_CARD_SOURCES = [
  { title: "FDA: Information about naloxone and nalmefene", url: "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/information-about-naloxone-and-nalmefene" },
  { title: "CDC: Lifesaving naloxone", url: "https://www.cdc.gov/stop-overdose/caring/naloxone.html" },
  { title: "SAMHSA: Overdose prevention and response toolkit", url: "https://library.samhsa.gov/product/overdose-prevention-response-toolkit/pep23-03-00-001" },
  { title: "NEXT Distro: free naloxone by state", url: "https://nextdistro.org/naloxone" },
]
