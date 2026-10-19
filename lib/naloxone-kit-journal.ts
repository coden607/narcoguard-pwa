export interface NaloxoneKitEntry {
  id: string
  location: string
  checkedOn: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function normalizeNaloxoneKits(value: unknown): NaloxoneKitEntry[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: NaloxoneKitEntry[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const row = item as Partial<NaloxoneKitEntry>
    const id = typeof row.id === "string" ? row.id.trim().slice(0, 80) : ""
    const location = typeof row.location === "string" ? row.location.trim().slice(0, 100) : ""
    const checkedOn = typeof row.checkedOn === "string" && DATE_RE.test(row.checkedOn) ? row.checkedOn : ""
    if (!id || !location || !checkedOn || seen.has(id)) continue
    seen.add(id)
    out.push({ id, location, checkedOn })
    if (out.length >= 20) break
  }
  return out
}

export type NaloxoneKitFreshness = "checked-recently" | "check-is-old" | "future-date"

export function naloxoneKitFreshness(checkedOn: string, today: string, staleAfterDays = 90): NaloxoneKitFreshness {
  if (!DATE_RE.test(checkedOn) || !DATE_RE.test(today)) return "check-is-old"
  const checked = Date.parse(`${checkedOn}T00:00:00Z`)
  const now = Date.parse(`${today}T00:00:00Z`)
  if (checked > now) return "future-date"
  const days = Math.floor((now - checked) / 86_400_000)
  return days > staleAfterDays ? "check-is-old" : "checked-recently"
}
