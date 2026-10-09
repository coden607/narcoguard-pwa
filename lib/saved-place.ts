// Where to search, remembered on this device only so a person enters a ZIP or shares a location once.
// Coordinates are rounded to about 1 km before they are saved; nothing here is sent anywhere by itself.
// The person can forget it with one tap, and it is never required for any help.

export const SAVED_PLACE_KEY = "narcoguard_saved_place_v1"
export const REMEMBER_PLACE_KEY = "narcoguard_remember_place_v1"

export type SavedPlace = { zip: string } | { lat: number; lon: number }

const round = (value: number) => Math.round(value * 100) / 100

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">

export function readSavedPlace(store: Store | undefined): SavedPlace | null {
  try {
    const value = JSON.parse(store?.getItem(SAVED_PLACE_KEY) ?? "null") as Record<string, unknown> | null
    if (value && typeof value.zip === "string" && /^\d{5}$/.test(value.zip)) return { zip: value.zip }
    if (value && typeof value.lat === "number" && typeof value.lon === "number" && Math.abs(value.lat) <= 90 && Math.abs(value.lon) <= 180) {
      return { lat: round(value.lat), lon: round(value.lon) }
    }
  } catch {
    // Unreadable or blocked storage simply means nothing is remembered.
  }
  return null
}

export function savePlace(store: Store | undefined, place: SavedPlace): void {
  if ("zip" in place && !/^\d{5}$/.test(place.zip)) return
  const value = "zip" in place ? { zip: place.zip } : { lat: round(place.lat), lon: round(place.lon) }
  try { store?.setItem(SAVED_PLACE_KEY, JSON.stringify(value)) } catch { /* storage full or blocked */ }
}

export function forgetPlace(store: Store | undefined): void {
  try { store?.removeItem(SAVED_PLACE_KEY) } catch { /* nothing to forget */ }
}

/** Remembering is on unless the person turned it off. */
export function readRememberChoice(store: Store | undefined): boolean {
  try { return store?.getItem(REMEMBER_PLACE_KEY) !== "off" } catch { return false }
}

export function saveRememberChoice(store: Store | undefined, remember: boolean): void {
  try {
    store?.setItem(REMEMBER_PLACE_KEY, remember ? "on" : "off")
    if (!remember) store?.removeItem(SAVED_PLACE_KEY)
  } catch { /* storage blocked */ }
}

/** A ZIP the person stated in words ("my zip is 13901", "I'm in 13901", or just "13901"); undefined otherwise. */
export function zipFromMessage(text: string): string | undefined {
  const trimmed = text.trim()
  if (/^\d{5}$/.test(trimmed)) return trimmed
  const match = /\b(?:zip(?:\s*code)?(?:\s*is)?|i(?:'m| am) in|near|around)\s*:?\s*(\d{5})\b/i.exec(trimmed)
  return match?.[1]
}
