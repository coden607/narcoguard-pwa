export interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  notifyMethod: "call" | "text" | "both"
}

export interface NaloxoneLocation {
  id: string
  description: string
  location: string
  instructions?: string
}

export interface UserPreferences {
  name: string
  hasCompletedOnboarding: boolean
  skippedSetup?: boolean
  emergencyContacts: EmergencyContact[]
  naloxoneLocations: NaloxoneLocation[]
  emergencyPreferences: {
    soundAlarm: boolean
    call911: boolean
    notifyContacts: boolean
    shareLocation: boolean
  }
  privacy: {
    incognitoMode: boolean
    shareWithHeroes: boolean
    anonymousMode: boolean
  }
  features: {
    neverUseAlone: boolean
    autoDetection: boolean
    voiceActivation: boolean
  }
  legal: {
    acceptedTerms: boolean
    acceptedPrivacy: boolean
    acceptedHIPAA: boolean
    acknowledgedGoodSamaritan: boolean
    state?: string
  }
  heroStatus?: {
    isHero: boolean
    completedTraining: boolean
    certifications: string[]
  }
}

const DEFAULT_PREFERENCES: UserPreferences = {
  name: "",
  hasCompletedOnboarding: false,
  skippedSetup: false,
  emergencyContacts: [],
  naloxoneLocations: [],
  emergencyPreferences: {
    soundAlarm: true,
    call911: true,
    notifyContacts: true,
    shareLocation: true,
  },
  privacy: {
    incognitoMode: false,
    shareWithHeroes: false,
    anonymousMode: false,
  },
  features: {
    neverUseAlone: false,
    autoDetection: false,
    voiceActivation: true,
  },
  legal: {
    acceptedTerms: false,
    acceptedPrivacy: false,
    acceptedHIPAA: false,
    acknowledgedGoodSamaritan: false,
  },
}

const STORAGE_KEY = "narcoguard_preferences"
const CHANGE_EVENT = "narcoguard:preferences-change"
// A denied storage write must not trap someone in setup. This fallback lasts only
// for this tab's current visit and never leaves the device.
let temporaryPreferences: string | null = null

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
const text = (value: unknown, max = 160) => typeof value === "string" ? value.trim().slice(0, max) : ""

function booleanFields<T extends Record<string, boolean>>(defaults: T, value: unknown): T {
  const saved = record(value)
  return Object.fromEntries(Object.entries(defaults).map(([key, fallback]) => [key, typeof saved[key] === "boolean" ? saved[key] : fallback])) as T
}

export function parseUserPreferences(stored: string | null): UserPreferences {
  let value: Record<string, unknown> = {}
  try {
    value = record(stored ? JSON.parse(stored) : null)
  } catch {
    // Invalid or legacy data must not break access to the dashboard.
  }
  const legal = record(value.legal)
  const hero = record(value.heroStatus)
  return {
    name: text(value.name),
    hasCompletedOnboarding: value.hasCompletedOnboarding === true,
    skippedSetup: value.skippedSetup === true,
    emergencyContacts: Array.isArray(value.emergencyContacts) ? value.emergencyContacts.flatMap((item) => {
      const contact = record(item)
      const phone = text(contact.phone, 30)
      if (!text(contact.id) || !text(contact.name) || !/^\+?[0-9 ().-]{3,30}$/.test(phone) || phone.replace(/\D/g, "").length < 3) return []
      return [{ id: text(contact.id), name: text(contact.name), relationship: text(contact.relationship), phone, notifyMethod: contact.notifyMethod === "text" || contact.notifyMethod === "both" ? contact.notifyMethod : "call" } satisfies EmergencyContact]
    }) : [],
    naloxoneLocations: Array.isArray(value.naloxoneLocations) ? value.naloxoneLocations.flatMap((item) => {
      const location = record(item)
      if (!text(location.id) || !text(location.description) || !text(location.location)) return []
      return [{ id: text(location.id), description: text(location.description), location: text(location.location), instructions: text(location.instructions, 500) }]
    }) : [],
    emergencyPreferences: booleanFields(DEFAULT_PREFERENCES.emergencyPreferences, value.emergencyPreferences),
    privacy: booleanFields(DEFAULT_PREFERENCES.privacy, value.privacy),
    features: booleanFields(DEFAULT_PREFERENCES.features, value.features),
    legal: {
      acceptedTerms: legal.acceptedTerms === true,
      acceptedPrivacy: legal.acceptedPrivacy === true,
      acceptedHIPAA: legal.acceptedHIPAA === true,
      acknowledgedGoodSamaritan: legal.acknowledgedGoodSamaritan === true,
      ...(typeof legal.state === "string" ? { state: text(legal.state) } : {}),
    },
    ...(value.heroStatus ? { heroStatus: {
      isHero: hero.isHero === true,
      completedTraining: hero.completedTraining === true,
      certifications: Array.isArray(hero.certifications) ? hero.certifications.filter((item): item is string => typeof item === "string").map((item) => text(item)) : [],
    } } : {}),
  }
}

/** Raw stored value; a string is a stable snapshot for useSyncExternalStore. */
export function readStoredPreferences(): string {
  if (temporaryPreferences !== null) return temporaryPreferences
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ""
  } catch {
    // Storage can be unavailable (private mode, blocked site data); treat as no saved preferences.
    return ""
  }
}

/** Notifies on changes from this tab (save/reset) and other tabs (storage event). */
export function subscribeToPreferences(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === STORAGE_KEY) {
      temporaryPreferences = null
      onChange()
    }
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

export function getUserPreferences(): UserPreferences {
  if (typeof window === "undefined") return parseUserPreferences(null)
  return parseUserPreferences(readStoredPreferences())
}

export function saveUserPreferences(preferences: Partial<UserPreferences>) {
  if (typeof window === "undefined") return

  const current = getUserPreferences()
  const updated = { ...current, ...preferences }
  const raw = JSON.stringify(parseUserPreferences(JSON.stringify(updated)))
  try {
    localStorage.setItem(STORAGE_KEY, raw)
    temporaryPreferences = null
  } catch {
    temporaryPreferences = raw
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export function preferencesAreTemporary(): boolean {
  return temporaryPreferences !== null
}

export function resetUserPreferences() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
    temporaryPreferences = null
  } catch {
    temporaryPreferences = ""
  }
  window.dispatchEvent(new Event(CHANGE_EVENT))
}
