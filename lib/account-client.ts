import type { ContactsState, StoredContact } from "@/lib/emergency-contacts-store"
import { parseUserPreferences, type UserPreferences } from "@/lib/user-preferences"

export type AccountBackup = { v: 1; savedAt: string; contacts: ContactsState; preferences: UserPreferences }
type FetchLike = typeof fetch

export async function requestAccount<T>(url: string, init?: RequestInit, fetchImpl: FetchLike = fetch): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  try {
    const response = await fetchImpl(url, { cache: "no-store", ...init, signal: init?.signal ?? AbortSignal.timeout(12_000), headers: { "Content-Type": "application/json", ...init?.headers } })
    const data: unknown = await response.json()
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid response")
    return { ok: response.ok, status: response.status, data: data as T & { error?: string } }
  } catch {
    return { ok: false, status: 0, data: { error: "Could not reach NarcoGuard. Check your connection and try again." } as T & { error?: string } }
  }
}

/** Do not show a signed-out state while the server session cookie is still active. */
export async function signOutAccount(fetchImpl: FetchLike = fetch): Promise<void> {
  const { ok, data } = await requestAccount<{ success?: boolean }>("/api/auth", { method: "POST", body: JSON.stringify({ action: "logout" }) }, fetchImpl)
  if (!ok || data.success !== true) throw new Error(data.error ?? "Sign out was not confirmed. Try again.")
}

/** A decrypted JSON value is still untrusted. Validate the whole backup before replacing local data. */
export function parseAccountBackup(value: unknown): AccountBackup | null {
  if (!value || typeof value !== "object") return null
  const backup = value as Partial<AccountBackup>
  if (backup.v !== 1 || typeof backup.savedAt !== "string" || !Number.isFinite(Date.parse(backup.savedAt))) return null
  if (!backup.preferences || typeof backup.preferences !== "object" || Array.isArray(backup.preferences)) return null
  const contacts = backup.contacts
  if (!contacts || typeof contacts.senderName !== "string" || !Array.isArray(contacts.contacts) || contacts.contacts.length > 5) return null
  if (!contacts.contacts.every((item: StoredContact) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.masked === "string" && Number.isFinite(item.addedAt) &&
    (item.status === "invited" || item.status === "confirmed") &&
    (item.proof === undefined || typeof item.proof === "string") &&
    (item.invite === undefined || typeof item.invite === "string") &&
    (item.link === undefined || typeof item.link === "string"))) return null
  return { v: 1, savedAt: backup.savedAt, contacts, preferences: parseUserPreferences(JSON.stringify(backup.preferences)) }
}
