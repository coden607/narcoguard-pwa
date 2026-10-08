// Defensive parser for OpenStreetMap `opening_hours` values. Supports a small,
// explicit subset that covers the vast majority of real-world values: 24/7,
// single day ranges (Mo-Fr), day lists (Mo,We,Fr), comma-separated time ranges
// (09:00-12:00,13:00-17:00), semicolon-separated rules, and ranges that cross
// midnight (20:00-02:00). Rules without a day apply every day. Anything outside
// the subset (PH variants, week numbers, sunrise-sunset, malformed input) keeps
// the raw string and reports openNow: null — never throw, never guess. Pure
// functions only: the reference time comes solely from the injectable `now`.

export type ParsedHours = {
  display: string
  openNow: boolean | null
  is24_7?: boolean
}

type DayRange = { start: number; end: number }

type HoursRule = {
  /** JavaScript day numbers (0 = Sunday ... 6 = Saturday) the rule applies to. */
  days: ReadonlySet<number>
  /** Minutes since midnight; `end <= start` means the range crosses midnight. */
  ranges: ReadonlyArray<DayRange>
}

const MAX_DISPLAY = 80

const DAY_NUMBERS: Record<string, number> = { Su: 0, Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6 }
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const ALL_DAYS = new Set([0, 1, 2, 3, 4, 5, 6])

const TIME_RE = /^(\d{1,2}):(\d{2})$/
const RANGE_RE = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/
const DAY_TOKEN_RE = /^(?:Mo|Tu|We|Th|Fr|Sa|Su)$/
const DAY_SPEC_RE = /^((?:Mo|Tu|We|Th|Fr|Sa|Su)(?:[-,](?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+(.+)$/

function rawDisplay(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim()
  return trimmed.length > MAX_DISPLAY ? trimmed.slice(0, MAX_DISPLAY) : trimmed
}

/** "09:00" → "9 AM"; "17:30" → "5:30 PM". Unrecognized input is returned as-is. */
export function humanizeTime(hhmm: string): string {
  const match = TIME_RE.exec(hhmm)
  if (!match) return hhmm
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (hour > 23 || minute > 59) return hhmm
  const suffix = hour < 12 ? "AM" : "PM"
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return minute === 0 ? `${hour12} ${suffix}` : `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`
}

function humanizeMinutes(minutes: number): string {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return humanizeTime(`${hour}:${String(minute).padStart(2, "0")}`)
}

function parseDaySpec(spec: string): Set<number> | null {
  const days = new Set<number>()
  for (const part of spec.split(",")) {
    const pieces = part.split("-")
    if (pieces.length > 2) return null
    const from = pieces[0]
    const to = pieces.length === 2 ? pieces[1] : undefined
    if (!DAY_TOKEN_RE.test(from) || (to !== undefined && !DAY_TOKEN_RE.test(to))) return null
    const fromNum = DAY_NUMBERS[from]
    if (to === undefined) {
      days.add(fromNum)
    } else {
      const toNum = DAY_NUMBERS[to]
      let cursor = fromNum
      // Walk forward (wrapping past Saturday into Sunday) until the end day is included.
      for (let guard = 0; guard < 8; guard += 1) {
        days.add(cursor)
        if (cursor === toNum) break
        cursor = (cursor + 1) % 7
      }
    }
  }
  return days.size > 0 ? days : null
}

function parseRanges(text: string): ReadonlyArray<DayRange> | null {
  const ranges: DayRange[] = []
  for (const piece of text.split(",")) {
    const match = RANGE_RE.exec(piece.trim())
    if (!match) return null
    const startHour = Number(match[1])
    const startMinute = Number(match[2])
    const endHour = Number(match[3])
    const endMinute = Number(match[4])
    if (startMinute > 59 || endMinute > 59 || startHour > 23 || endHour > 24 || (endHour === 24 && endMinute > 0)) return null
    const start = startHour * 60 + startMinute
    const end = endHour * 60 + endMinute // 24:00 closes at end of day
    if (end === start) return null
    ranges.push({ start, end })
  }
  return ranges.length > 0 ? ranges : null
}

function parseRule(rule: string): HoursRule | null {
  if (!rule) return null
  const dayMatch = DAY_SPEC_RE.exec(rule)
  let days: Set<number>
  let timeText: string
  if (dayMatch) {
    const parsed = parseDaySpec(dayMatch[1])
    if (!parsed) return null
    days = parsed
    timeText = dayMatch[2]
  } else {
    days = ALL_DAYS
    timeText = rule
  }
  const ranges = parseRanges(timeText)
  if (!ranges) return null
  return { days, ranges }
}

/** Compress a set of JS day numbers into display runs, e.g. {1,2,3,4,5} → "Mon–Fri". */
function humanizeDays(days: ReadonlySet<number>): string {
  if (days.size === 7) return "Daily"
  const runs: Array<{ from: number; to: number }> = []
  for (const day of days) {
    if (days.has((day + 6) % 7)) continue // continues a run started earlier in the week
    let to = day
    for (let guard = 0; guard < 7; guard += 1) {
      const next = (to + 1) % 7
      if (!days.has(next)) break
      to = next
    }
    runs.push({ from: day, to })
  }
  runs.sort((a, b) => a.from - b.from)
  return runs.map(({ from, to }) => (from === to ? DAY_NAMES[from] : `${DAY_NAMES[from]}–${DAY_NAMES[to]}`)).join(", ")
}

function humanize(rules: ReadonlyArray<HoursRule>, raw: string): string {
  const text = rules
    .map((rule) => {
      const timeText = rule.ranges.map(({ start, end }) => `${humanizeMinutes(start)}–${humanizeMinutes(end)}`).join(", ")
      const dayText = humanizeDays(rule.days)
      return dayText ? `${dayText} ${timeText}` : timeText
    })
    .join("; ")
  return text.length <= MAX_DISPLAY ? text : rawDisplay(raw)
}

function isOpenNow(rules: ReadonlyArray<HoursRule>, now: Date): boolean {
  const day = now.getDay()
  const minute = now.getHours() * 60 + now.getMinutes()
  const openForDay = (rule: HoursRule, dayNum: number): boolean =>
    rule.days.has(dayNum) &&
    rule.ranges.some(({ start, end }) => {
      if (start < end) return minute >= start && minute < end
      // Crosses midnight: the evening part belongs to this day.
      return minute >= start
    })
  if (rules.some((rule) => openForDay(rule, day))) return true
  // A range that crossed midnight last night is still open before its end time today.
  const yesterday = (day + 6) % 7
  return rules.some(
    (rule) =>
      rule.days.has(yesterday) &&
      rule.ranges.some(({ start, end }) => start > end && minute < end),
  )
}

/**
 * Parse an OSM `opening_hours` value. Never throws: anything outside the
 * supported subset returns the trimmed raw string with `openNow: null`.
 * `openNow` is only computed when a reference time is injected; the function
 * stays deterministic otherwise.
 */
export function parseOpeningHours(raw: string | undefined | null, now?: Date): ParsedHours {
  const fallback = { display: rawDisplay(raw), openNow: null }
  if (!raw) return fallback
  const text = raw.trim()
  if (text === "24/7") return { display: "24/7", openNow: now ? true : null, is24_7: true }
  const rules: HoursRule[] = []
  for (const piece of text.split(";")) {
    const rule = parseRule(piece.trim())
    if (!rule) return fallback
    rules.push(rule)
  }
  return { display: humanize(rules, raw), openNow: now ? isOpenNow(rules, now) : null }
}
