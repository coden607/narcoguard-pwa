import type { Need } from "./guardian-stability"

export interface ResourceLink { title: string; description: string; url: string }

export function normalizePostalCode(value: string): string {
  const trimmed = value.trim()
  return /^\d{5}(?:-\d{4})?$/.test(trimmed) ? trimmed : ""
}

const directory: ResourceLink = {
  title: "Find local help through 211",
  description: "Search with your ZIP code for current services. Confirm hours, availability and requirements with the provider.",
  url: "https://www.211.org/get-help",
}

export function resourcesForNeed(need: Need, postalCode: string): ResourceLink[] {
  const zip = normalizePostalCode(postalCode)
  const localDirectory = { ...directory, description: zip ? `Enter ZIP ${zip} on 211 to search nearby services. Confirm hours, availability and requirements with the provider.` : directory.description }
  if (need === "food") return [
    localDirectory,
    { title: "Check and apply for New York SNAP", description: "Use the state's eligibility screening and application; the app cannot determine eligibility.", url: "https://mybenefits.ny.gov/" },
  ]
  if (need === "treatment") return [
    { title: "Find treatment (SAMHSA)", description: "Search a federal treatment directory and contact a program to confirm details.", url: "https://findtreatment.gov/" },
    localDirectory,
  ]
  return [localDirectory]
}
