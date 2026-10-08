// Harm-reduction, recovery-meeting and benefits links for /safer-use. General information only;
// every link was checked to resolve on 2026-10-08 and points to the organization that runs it.
// Never describe a test strip result as proof a drug is safe, and never promise an outcome.

export const SAFER_USE_REVIEWED = "2026-10-08"

export interface HelpLine {
  name: string
  /** Digits only, used for the tel: link. */
  tel: string
  display: string
  what: string
  source: string
}

export interface HelpLink {
  title: string
  url: string
  what: string
}

/** Never Use Alone: a person stays on the line while someone uses and sends help to the given address if they stop responding. */
export const NEVER_USE_ALONE: HelpLine = {
  name: "Never Use Alone",
  tel: "18004843731",
  display: "1-800-484-3731",
  what: "If you are going to use by yourself, call. A volunteer stays on the line, asks for your location, and sends EMS to that address only if you stop responding. It is free and confidential.",
  source: "https://neverusealone.com",
}

export const CRISIS_LINES: HelpLine[] = [
  { name: "Emergency", tel: "911", display: "911", what: "Someone won't wake up or isn't breathing normally.", source: "https://www.911.gov" },
  NEVER_USE_ALONE,
  { name: "988 Suicide & Crisis Lifeline", tel: "988", display: "988", what: "Call or text for a mental health or substance use crisis, any time.", source: "https://988lifeline.org" },
  { name: "SAMHSA National Helpline", tel: "18006624357", display: "1-800-662-4357", what: "Free, confidential treatment referral, 24/7, in English and Spanish.", source: "https://www.samhsa.gov/find-help/helplines/national-helpline" },
  { name: "211", tel: "211", display: "211", what: "Local food, shelter, bills and other help from a person who knows your area.", source: "https://www.211.org/get-help" },
]

export const NALOXONE_SOURCES: HelpLink[] = [
  { title: "Any pharmacy, without a prescription", url: "https://www.fda.gov/drugs/postmarket-drug-safety-information-patients-and-providers/information-about-naloxone-and-nalmefene", what: "Naloxone nasal spray is sold over the counter in the US. Ask the pharmacist, or look near the pain relievers. Insurance or Medicaid may cover it." },
  { title: "NEXT Distro (free by mail)", url: "https://nextdistro.org/naloxone", what: "Find free naloxone programs, including mail-based ones, in your state." },
  { title: "Find treatment and harm-reduction programs", url: "https://findtreatment.gov", what: "SAMHSA's locator. Many programs hand out naloxone and test strips at no cost." },
]

export const TEST_STRIP_FACTS: string[] = [
  "You can't see, smell or taste fentanyl. Test strips are the only way most people can check a drug for it.",
  "Mix a small amount of the drug with water, dip the strip, and read it within a couple of minutes. Follow the instructions that come with your strips.",
  "A negative result does not mean the drug is safe. Fentanyl can be clumped in one part of a batch and missed by your sample, and strips don't detect every substance.",
  "Xylazine test strips are also available, and some harm-reduction programs have machines that check drugs. Xylazine doesn't respond to naloxone, but give naloxone anyway: it is usually mixed with opioids.",
  "Still use with someone or call Never Use Alone, keep naloxone out, and start with a small amount.",
  "Test strip laws differ by state. Harm-reduction programs can tell you the rules where you live.",
]

export const TEST_STRIP_SOURCES: HelpLink[] = [
  { title: "NIDA: Fentanyl", url: "https://nida.nih.gov/research-topics/fentanyl", what: "How test strips work and their limits." },
  { title: "NIDA: Xylazine", url: "https://nida.nih.gov/research-topics/xylazine", what: "What xylazine is and why naloxone is still given." },
  { title: "SAMHSA overdose prevention toolkit", url: "https://library.samhsa.gov/product/overdose-prevention-response-toolkit/pep23-03-00-001", what: "Federal guidance for people who use drugs, families and responders." },
]

export const MEETING_FINDERS: HelpLink[] = [
  { title: "Narcotics Anonymous", url: "https://www.na.org/meetingsearch/", what: "In-person and online NA meetings." },
  { title: "Alcoholics Anonymous", url: "https://www.aa.org/find-aa", what: "Local AA contacts and online meetings." },
  { title: "SMART Recovery", url: "https://meetings.smartrecovery.org/meetings/", what: "Science-based, self-empowering meetings, many online." },
  { title: "Recovery Dharma", url: "https://recoverydharma.org/meetings", what: "Buddhist-inspired peer meetings, online and in person." },
]

export const BENEFIT_LINKS: HelpLink[] = [
  { title: "USA.gov benefit finder", url: "https://www.usa.gov/benefit-finder", what: "Answer a few questions to see federal benefits you may qualify for." },
  { title: "SNAP (food assistance)", url: "https://www.fns.usda.gov/snap/state-directory", what: "Apply through your state's SNAP office." },
  { title: "Medicaid", url: "https://www.healthcare.gov/medicaid-chip/getting-medicaid-chip/", what: "Free or low-cost health coverage, including treatment for substance use." },
  { title: "WIC", url: "https://www.fns.usda.gov/wic", what: "Food and support for pregnant people, new parents and young children." },
  { title: "LIHEAP (heating and cooling bills)", url: "https://www.acf.gov/ocs/programs/liheap", what: "Help paying home energy bills." },
  { title: "findhelp.org", url: "https://www.findhelp.org", what: "Search free and reduced-cost local programs by ZIP code." },
]

/** Directions open the person's own maps app to the listing; only the listing's coordinates are sent, never theirs. */
export function directionsUrl(lat: number | undefined, lon: number | undefined): string | undefined {
  if (lat === undefined || lon === undefined || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(5)},${lon.toFixed(5)}`
}
