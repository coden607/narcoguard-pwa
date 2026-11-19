// On-call readiness is a self-attestation that an enrolled Hero is carrying unexpired
// naloxone. It does not dispatch anyone and does not turn nearby Hero requests on.

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export type HeroReadiness = {
  enrolled: boolean
  expiresAt: string
  naloxoneReady: boolean
  naloxoneExpiresOn: string | null
  onCall: boolean
  onCallSince: string | null
}

/** UTC calendar date (YYYY-MM-DD). The server uses this so a browser cannot extend an expiry. */
export function utcDate(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function certificateCurrent(expiresAt: string, now = Date.now()): boolean {
  const time = Date.parse(expiresAt)
  return Number.isFinite(time) && time > now
}

export function naloxoneCurrent(ready: boolean, expiresOn: string | null, today: string): boolean {
  return ready === true && typeof expiresOn === "string" && ISO_DATE.test(expiresOn) && expiresOn >= today
}

/** On Call is allowed only for an enrolled Hero whose certificate and naloxone are both current. */
export function canGoOnCall(input: {
  enrolled: boolean
  expiresAt: string
  naloxoneReady: boolean
  naloxoneExpiresOn: string | null
  now?: number
  today?: string
}): boolean {
  const now = input.now ?? Date.now()
  const today = input.today ?? utcDate(new Date(now))
  return input.enrolled === true
    && certificateCurrent(input.expiresAt, now)
    && naloxoneCurrent(input.naloxoneReady, input.naloxoneExpiresOn, today)
}

/** Empty is "no date". Anything else must be a real YYYY-MM-DD. */
export function parseNaloxoneExpiry(value: unknown): { ok: true; date: string | null } | { ok: false } {
  if (value === undefined || value === null || value === "") return { ok: true, date: null }
  if (typeof value === "string" && ISO_DATE.test(value)) return { ok: true, date: value }
  return { ok: false }
}
