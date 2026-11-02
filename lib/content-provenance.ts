// Where each page of safety guidance comes from and when it was last checked (#300).
// tests/feature-content-provenance.test.ts fails when a safety page has no entry, no linked
// source or a bad date, and warns when a review is more than a year old. Each entry reuses the
// sources and review date the page already shows, so the two cannot drift apart.
import { AFTERCARE_REVIEWED, AFTERCARE_SOURCES } from "@/lib/aftercare"
import { CARE_DIRECTORIES_REVIEWED, PREVENTION_DIRECTORIES, TREATMENT_DIRECTORIES } from "@/lib/care-directories"
import { PHARMACY_CARD_REVIEWED, PHARMACY_CARD_SOURCES } from "@/lib/pharmacy-card"
import { RESCUE_BREATHING_REVIEWED, RESCUE_BREATHING_SOURCES } from "@/lib/rescue-breathing"
import { DEBRIEF_REVIEWED, DEBRIEF_SOURCES } from "@/lib/responder-debrief"
import { GUIDES_REVIEWED, GUIDE_SOURCES } from "@/lib/response-guides"
import { NALOXONE_SOURCES, SAFER_USE_REVIEWED, TEST_STRIP_SOURCES } from "@/lib/safer-use"
import { TOLERANCE_REVIEWED, TOLERANCE_SOURCES } from "@/lib/tolerance-card"
import { WOUND_CARE_REVIEWED, WOUND_CARE_SOURCES } from "@/lib/wound-care"

export interface Provenance {
  reviewed: string
  sources: { title: string; url?: string }[]
}

/** Months after which a review is flagged as due. */
export const REVIEW_DUE_MONTHS = 12

// The shared overdose steps (emergency modal, /bystander, error screens) cite CDC and SAMHSA.
const OVERDOSE_STEP_SOURCES = [
  { title: "CDC: Lifesaving naloxone", url: "https://www.cdc.gov/stop-overdose/caring/naloxone.html" },
  { title: "SAMHSA: Overdose prevention and response toolkit", url: "https://library.samhsa.gov/product/overdose-prevention-response-toolkit/pep23-03-00-001" },
]

const directoryLinks = (groups: typeof TREATMENT_DIRECTORIES) => groups.flatMap((group) => group.links.map((link) => ({ title: link.title, url: link.url })))

export const CONTENT_PROVENANCE: Record<string, Provenance> = {
  "/ar": { reviewed: GUIDES_REVIEWED, sources: GUIDE_SOURCES },
  "/bystander": { reviewed: "2026-11-02", sources: OVERDOSE_STEP_SOURCES },
  "/aftercare": { reviewed: AFTERCARE_REVIEWED, sources: AFTERCARE_SOURCES },
  "/rescue-breathing": { reviewed: RESCUE_BREATHING_REVIEWED, sources: RESCUE_BREATHING_SOURCES },
  "/wound-care": { reviewed: WOUND_CARE_REVIEWED, sources: WOUND_CARE_SOURCES },
  "/naloxone-card": { reviewed: PHARMACY_CARD_REVIEWED, sources: PHARMACY_CARD_SOURCES },
  "/debrief": { reviewed: DEBRIEF_REVIEWED, sources: DEBRIEF_SOURCES },
  "/safer-use": { reviewed: [SAFER_USE_REVIEWED, TOLERANCE_REVIEWED].sort()[0], sources: [...NALOXONE_SOURCES, ...TEST_STRIP_SOURCES, ...TOLERANCE_SOURCES] },
  "/treatment": { reviewed: CARE_DIRECTORIES_REVIEWED, sources: directoryLinks(TREATMENT_DIRECTORIES) },
  "/prevention": { reviewed: CARE_DIRECTORIES_REVIEWED, sources: directoryLinks(PREVENTION_DIRECTORIES) },
}

/** Whole months between a review date and today; NaN for a bad date. */
export function monthsSince(reviewed: string, today = new Date()): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewed)) return Number.NaN
  const date = new Date(`${reviewed}T00:00:00Z`)
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== reviewed) return Number.NaN
  return (today.getUTCFullYear() - date.getUTCFullYear()) * 12 + (today.getUTCMonth() - date.getUTCMonth()) - (today.getUTCDate() < date.getUTCDate() ? 1 : 0)
}
