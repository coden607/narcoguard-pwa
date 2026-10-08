import { strict as assert } from "node:assert"
import { test } from "node:test"
import { humanizeTime, parseOpeningHours } from "../lib/opening-hours"

// Fixed reference times (local): 2026-10-05 is a Monday.
const TUE = (time: string) => new Date(`2026-10-06T${time}:00`)
const WED = (time: string) => new Date(`2026-10-07T${time}:00`)
const FRI = (time: string) => new Date(`2026-10-09T${time}:00`)
const SAT = (time: string) => new Date(`2026-10-10T${time}:00`)
const SUN = (time: string) => new Date(`2026-10-11T${time}:00`)

test("24/7 is recognized and always open", () => {
  assert.deepEqual(parseOpeningHours("24/7", TUE("03:00")), { display: "24/7", openNow: true, is24_7: true })
  assert.deepEqual(parseOpeningHours(" 24/7 ", SUN("23:59")), { display: "24/7", openNow: true, is24_7: true })
})

test("openNow is null when no reference time is injected, even for 24/7", () => {
  assert.equal(parseOpeningHours("24/7").openNow, null)
  const withoutNow = parseOpeningHours("Mo-Fr 09:00-17:00")
  assert.equal(withoutNow.openNow, null)
  assert.equal(withoutNow.display, "Mon–Fri 9 AM–5 PM")
})

test("a weekday range is open mid-morning on a Tuesday", () => {
  assert.equal(parseOpeningHours("Mo-Fr 09:00-17:00", TUE("10:00")).openNow, true)
})

test("a weekday range is closed on Sunday and outside its hours", () => {
  const value = parseOpeningHours("Mo-Fr 09:00-17:00")
  assert.equal(value.openNow, null)
  assert.equal(parseOpeningHours("Mo-Fr 09:00-17:00", SUN("10:00")).openNow, false)
  assert.equal(parseOpeningHours("Mo-Fr 09:00-17:00", TUE("08:59")).openNow, false)
  assert.equal(parseOpeningHours("Mo-Fr 09:00-17:00", TUE("17:00")).openNow, false)
})

test("a lunch split leaves midday closed and reopens in the afternoon", () => {
  const value = parseOpeningHours("Mo-Fr 09:00-12:00,13:00-17:00", TUE("12:30"))
  assert.equal(value.openNow, false)
  assert.equal(parseOpeningHours("Mo-Fr 09:00-12:00,13:00-17:00", TUE("13:30")).openNow, true)
  assert.equal(value.display, "Mon–Fri 9 AM–12 PM, 1 PM–5 PM")
})

test("a weekend rule applies to Saturday and Sunday only", () => {
  const value = parseOpeningHours("Sa,Su 10:00-14:00")
  assert.equal(value.display, "Sat–Sun 10 AM–2 PM")
  assert.equal(parseOpeningHours("Sa,Su 10:00-14:00", SAT("11:00")).openNow, true)
  assert.equal(parseOpeningHours("Sa,Su 10:00-14:00", SUN("11:00")).openNow, true)
  assert.equal(parseOpeningHours("Sa,Su 10:00-14:00", WED("11:00")).openNow, false)
  assert.equal(parseOpeningHours("Sa,Su 10:00-14:00", SAT("15:00")).openNow, false)
})

test("a day list matches only the listed days", () => {
  const value = parseOpeningHours("Mo,We,Fr 09:00-17:00")
  assert.equal(value.display, "Mon, Wed, Fri 9 AM–5 PM")
  assert.equal(parseOpeningHours("Mo,We,Fr 09:00-17:00", WED("10:00")).openNow, true)
  assert.equal(parseOpeningHours("Mo,We,Fr 09:00-17:00", FRI("16:00")).openNow, true)
  assert.equal(parseOpeningHours("Mo,We,Fr 09:00-17:00", TUE("10:00")).openNow, false)
})

test("semicolon-separated rules combine weekday and weekend hours", () => {
  const raw = "Mo-Fr 09:00-17:00; Sa 10:00-14:00"
  const value = parseOpeningHours(raw)
  assert.equal(value.display, "Mon–Fri 9 AM–5 PM; Sat 10 AM–2 PM")
  assert.equal(parseOpeningHours(raw, FRI("16:00")).openNow, true)
  assert.equal(parseOpeningHours(raw, SAT("11:00")).openNow, true)
  assert.equal(parseOpeningHours(raw, SAT("15:00")).openNow, false)
  assert.equal(parseOpeningHours(raw, SUN("11:00")).openNow, false)
  assert.equal(parseOpeningHours(raw, FRI("18:00")).openNow, false)
})

test("a range crossing midnight stays open into the next morning", () => {
  const raw = "Mo-Fr 20:00-02:00"
  const value = parseOpeningHours(raw)
  assert.equal(value.display, "Mon–Fri 8 PM–2 AM")
  assert.equal(parseOpeningHours(raw, TUE("21:00")).openNow, true)
  assert.equal(parseOpeningHours(raw, WED("01:00")).openNow, true, "still open from Tuesday night's range")
  assert.equal(parseOpeningHours(raw, SAT("01:00")).openNow, true, "Friday night's range reaches Saturday morning")
  assert.equal(parseOpeningHours(raw, SUN("01:00")).openNow, false, "no weekend rule covers Saturday night")
  assert.equal(parseOpeningHours(raw, WED("12:00")).openNow, false)
})

test("rules without a day apply every day", () => {
  const value = parseOpeningHours("09:00-17:00")
  assert.equal(value.display, "Daily 9 AM–5 PM")
  assert.equal(parseOpeningHours("09:00-17:00", SAT("10:00")).openNow, true)
  assert.equal(parseOpeningHours("09:00-17:00", SUN("10:00")).openNow, true)
  assert.equal(parseOpeningHours("09:00-17:00", TUE("18:00")).openNow, false)
})

test("24:00 is accepted as an end-of-day closing time", () => {
  const raw = "Mo-Fr 09:00-24:00"
  assert.equal(parseOpeningHours(raw, TUE("23:59")).openNow, true)
  assert.equal(parseOpeningHours(raw, TUE("08:59")).openNow, false)
  assert.equal(parseOpeningHours(raw, SUN("12:00")).openNow, false)
})

test("unsupported values never throw and keep the raw string with openNow null", () => {
  for (const raw of [
    "PH off",
    "Mo-Fr 09:00-17:00; PH off",
    "sunrise-sunset",
    "week 1-52/2 Mo 09:00-17:00",
    "Mo-Fr 9-17",
    "Mo-Fr",
    "Mo-Fr 09:00-17:00; closed",
    "Mo-Fr 09:00-17:00,18:00-20:00,Sa 10:00-12:00",
    "???",
  ]) {
    const value = parseOpeningHours(raw, TUE("10:00"))
    assert.equal(value.openNow, null, raw)
    assert.equal(value.display, raw.trim(), raw)
    assert.equal(value.is24_7, undefined, raw)
  }
})

test("undefined, null and empty input return an empty display without throwing", () => {
  assert.deepEqual(parseOpeningHours(undefined), { display: "", openNow: null })
  assert.deepEqual(parseOpeningHours(null), { display: "", openNow: null })
  assert.deepEqual(parseOpeningHours("   ", TUE("10:00")), { display: "", openNow: null })
})

test("out-of-subset raw values longer than 80 characters are trimmed for display", () => {
  const raw = `PH off; ${"x".repeat(120)}`
  const value = parseOpeningHours(raw, TUE("10:00"))
  assert.equal(value.openNow, null)
  assert.equal(value.display.length, 80)
  assert.equal(value.display, raw.slice(0, 80))
})

test("display falls back to the raw string when humanizing would exceed 80 characters", () => {
  const raw = "Mo,We,Fr 09:00-12:00,13:00-17:00,18:00-20:00; Tu,Th 09:00-12:00,13:00-17:00; Sa,Su 10:00-14:00"
  const value = parseOpeningHours(raw, WED("10:00"))
  const expectedFallback = raw.length > 80 ? raw.slice(0, 80) : raw
  assert.ok(value.display.length <= 80, value.display)
  assert.equal(value.display, expectedFallback)
  assert.equal(value.openNow, true, "the raw value is still parsed even when display falls back")
})

test("humanizeTime renders a 12-hour clock and passes through malformed input", () => {
  assert.equal(humanizeTime("09:00"), "9 AM")
  assert.equal(humanizeTime("00:00"), "12 AM")
  assert.equal(humanizeTime("12:00"), "12 PM")
  assert.equal(humanizeTime("17:30"), "5:30 PM")
  assert.equal(humanizeTime("7:05"), "7:05 AM")
  assert.equal(humanizeTime("25:99"), "25:99")
  assert.equal(humanizeTime("noon"), "noon")
})

test("day ranges that wrap the week end are expanded conservatively", () => {
  const value = parseOpeningHours("Fr-Mo 10:00-12:00")
  assert.equal(value.display, "Fri–Mon 10 AM–12 PM")
  assert.equal(parseOpeningHours("Fr-Mo 10:00-12:00", SUN("11:00")).openNow, true)
  assert.equal(parseOpeningHours("Fr-Mo 10:00-12:00", TUE("11:00")).openNow, false)
})
