// Public directories for care that is not an emergency (issues #269 and #273). Links only: the
// person opens the directory themselves, so no location, ZIP or search ever passes through
// NarcoGuard. Reviewed 2026-11-02 against the linked pages.
import type { HelpLink } from "@/lib/safer-use"

export const CARE_DIRECTORIES_REVIEWED = "2026-11-02"

export interface CallLine {
  name: string
  tel: string
  display: string
  what: string
}

export interface CareDirectoryGroup {
  id: string
  title: string
  intro: string
  links: HelpLink[]
}

// Buprenorphine and methadone treatment, including programs that start care by video.
// Sources: SAMHSA medication pages (buprenorphine, methadone), NIDA "Medications for opioid use
// disorder". Since 2023 any clinician with a standard DEA registration may prescribe buprenorphine.
export const TREATMENT_LINE: CallLine = {
  name: "SAMHSA National Helpline",
  tel: "18006624357",
  display: "1-800-662-4357",
  what: "Free, confidential, 24/7, in English and Spanish. They can help find treatment, including programs that take Medicaid or have no insurance requirement.",
}

export const TREATMENT_FACTS: string[] = [
  "Buprenorphine and methadone treat opioid use disorder and lower the risk of dying from an overdose.",
  "Any doctor, nurse practitioner or physician assistant who can prescribe controlled medicines can now prescribe buprenorphine. Many start it by video or phone visit, sometimes the same day.",
  "Methadone comes from a certified opioid treatment program, usually with visits in person.",
  "You can start treatment without having stopped using first. Ask the program what to expect.",
]

export const TREATMENT_DIRECTORIES: CareDirectoryGroup[] = [
  {
    id: "find-treatment",
    title: "Find a program",
    intro: "Filter by medication, telehealth, payment and language.",
    links: [
      { title: "FindTreatment.gov", url: "https://findtreatment.gov", what: "SAMHSA's locator for licensed programs. Use the filters for buprenorphine, methadone and telehealth." },
      { title: "Buprenorphine practitioner locator", url: "https://www.samhsa.gov/substance-use/treatment/find-treatment/buprenorphine-practitioner-locator", what: "Clinicians who have listed themselves as prescribing buprenorphine." },
      { title: "Opioid treatment program directory", url: "https://dpt2.samhsa.gov/treatment/", what: "Certified methadone and opioid treatment programs by state." },
    ],
  },
  {
    id: "learn",
    title: "Learn about the medicines",
    intro: "Plain information from federal agencies.",
    links: [
      { title: "SAMHSA: Buprenorphine", url: "https://www.samhsa.gov/substance-use/treatment/options/buprenorphine", what: "How it works, how it is started, and telehealth." },
      { title: "SAMHSA: Methadone", url: "https://www.samhsa.gov/substance-use/treatment/options/methadone", what: "How opioid treatment programs work." },
      { title: "NIDA: Medications for opioid use disorder", url: "https://nida.nih.gov/research-topics/medications-opioid-use-disorder", what: "What the research shows." },
    ],
  },
]

// Syringe services, HIV and hepatitis C testing, and PrEP (issue #273). Sources: CDC testing
// locator, HIV.gov locator and PrEP pages, NASEN's syringe services map. Free self-test kits are
// mailed by Together TakeMeHome, a CDC-funded program. Hepatitis C cure: CDC, "Hepatitis C basics".
export const PREVENTION_FACTS: string[] = [
  "Syringe services programs give new supplies and often free testing, naloxone, wound care and treatment referrals, with no judgment.",
  "Using new needles and your own supplies every time lowers the risk of HIV, hepatitis C and skin infections.",
  "Hepatitis C can be cured with medicine. Testing is the first step.",
  "PrEP is a medicine that lowers the chance of getting HIV, including from sharing injection equipment.",
]

export const PREVENTION_DIRECTORIES: CareDirectoryGroup[] = [
  {
    id: "syringe-services",
    title: "Syringe services",
    intro: "Find a program near you. Many also mail supplies.",
    links: [
      { title: "NASEN syringe services map", url: "https://www.nasen.org/map/", what: "Directory of syringe services programs across the U.S." },
    ],
  },
  {
    id: "testing",
    title: "HIV and hepatitis C testing",
    intro: "Testing is often free. Self-tests can be mailed to you.",
    links: [
      { title: "CDC testing locator", url: "https://gettested.cdc.gov/", what: "Find free, fast and confidential HIV, hepatitis and STI testing." },
      { title: "HIV.gov service locator", url: "https://locator.hiv.gov/", what: "HIV testing, PrEP and care near an address." },
      { title: "Together TakeMeHome", url: "https://together.takemehome.org/", what: "Free HIV self-test kits by mail." },
    ],
  },
  {
    id: "prep",
    title: "PrEP",
    intro: "Ask a clinic or health center. Programs can help with cost.",
    links: [
      { title: "PrEP locator", url: "https://preplocator.org/", what: "Find PrEP providers near you." },
      { title: "HIV.gov: PrEP", url: "https://www.hiv.gov/hiv-basics/hiv-prevention/using-hiv-medication-to-reduce-risk/pre-exposure-prophylaxis", what: "What PrEP is, who it is for, and how to pay for it." },
    ],
  },
]
