// Xylazine wound-care guide and clinic finder (issue #271). NEEDS CLINICAL REVIEW.
// NarcoGuard never asks for, takes or uploads wound photos. Sources, reviewed 2026-11-02:
// - CDC, "What you should know about xylazine": wounds can become infected and worsen quickly;
//   treated early they can be managed with basic wound care; untreated they can lead to amputation.
// - FDA, alert on xylazine in illicit drugs (Nov 2022): severe wounds, including necrosis.
// - NIDA, "Xylazine": skin ulcers and abscesses.
// General information, not medical advice.
import type { CareDirectoryGroup } from "@/lib/care-directories"

export const WOUND_CARE_REVIEWED = "2026-11-02"

export const WOUND_CARE_STEPS: string[] = [
  "Wash your hands, then gently clean the wound with clean water and mild soap, or saline.",
  "Cover it with a clean dressing and keep it a little moist. Change it every day, or sooner if it gets wet or dirty.",
  "Don't inject into or near a wound. Give skin and veins time to heal.",
  "Xylazine wounds can show up even where you didn't inject, and can get worse fast. Getting care early helps most.",
  "Many syringe services programs and health centers treat wounds for free or low cost, with no judgment.",
]

export const WOUND_DANGER_SIGNS: string[] = [
  "Fever, chills, or feeling very sick",
  "Redness, warmth or swelling that is spreading, or red streaks",
  "Pus, a bad smell, or skin turning black",
  "Pain that is much worse, or numbness",
  "A wound getting bigger quickly",
]

export const WOUND_CARE_FINDERS: CareDirectoryGroup[] = [
  {
    id: "wound-care-finders",
    title: "Find wound care",
    intro: "Call first. Ask if they treat wounds and whether there is a cost.",
    links: [
      { title: "Syringe services programs (NASEN map)", url: "https://www.nasen.org/map/", what: "Many programs offer wound care, supplies and referrals, often free." },
      { title: "Community health centers (HRSA)", url: "https://findahealthcenter.hrsa.gov/", what: "Federally funded clinics. Fees are based on income, and you can be seen without insurance." },
      { title: "211", url: "https://www.211.org/", what: "Local help line for clinics, transport and other support." },
    ],
  },
]

export const WOUND_CARE_SOURCES = [
  { title: "CDC: What you should know about xylazine", url: "https://www.cdc.gov/overdose-prevention/about/what-you-should-know-about-xylazine.html" },
  { title: "FDA: Risks of xylazine in illicit drugs", url: "https://www.fda.gov/drugs/drug-safety-and-availability/fda-alerts-health-care-professionals-risks-patients-exposed-xylazine-illicit-drugs" },
  { title: "NIDA: Xylazine", url: "https://nida.nih.gov/research-topics/xylazine" },
]
