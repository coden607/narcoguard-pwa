import assert from "node:assert/strict"
import { test } from "node:test"
import * as telemetry from "../lib/medication-reminders"
import {
  addReminder,
  confirmReminder,
  dueReminders,
  MEDICATION_REMINDER_MAX,
  nextOccurrence,
  readReminders,
  removeReminder,
  validateReminderInput,
} from "../lib/medication-reminders"

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void }

const memoryStorage = (): StorageLike => {
  const map = new Map<string, string>()
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => void map.set(key, value) }
}

const NOW = "2026-10-14T13:00:00.000Z" // Wednesday

test("module exports no adherence scoring or statistics functions", () => {
  const exported = Object.keys(telemetry)
  for (const name of exported) {
    assert.equal(/score|adherence|streak|compliance|rate/i.test(name), false, `${name} would be a scoring surface`)
  }
})

test("valid weekly medication anchor passes validation", () => {
  const result = validateReminderInput({
    kind: "medication",
    label: "Buprenorphine 8mg",
    time: "08:30",
    days: [1, 3, 5],
  })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.deepEqual(result.value.days, [1, 3, 5])
    assert.equal(result.value.date, null)
  }
})

test("one-shot appointment requires a valid date", () => {
  const missing = validateReminderInput({ kind: "appointment", label: "Clinic visit", time: "09:00", days: [] })
  assert.equal(missing.ok, false)
  const bad = validateReminderInput({ kind: "appointment", label: "Clinic visit", time: "09:00", days: [], date: "soon" })
  assert.equal(bad.ok, false)
  const good = validateReminderInput({ kind: "appointment", label: "Clinic visit", time: "09:00", days: [], date: "2026-10-20T09:00:00.000Z", place: "Southside clinic" })
  assert.equal(good.ok, true)
})

test("validation rejects bad kinds, times, and duplicate days", () => {
  assert.equal(validateReminderInput({ kind: "dose", label: "x", time: "08:00" }).ok, false)
  assert.equal(validateReminderInput({ kind: "medication", label: "x", time: "25:00", days: [1] }).ok, false)
  assert.equal(validateReminderInput({ kind: "medication", label: "x", time: "8:00", days: [1] }).ok, false)
  assert.equal(validateReminderInput({ kind: "medication", label: "x", time: "08:00", days: [1, 1] }).ok, false)
  assert.equal(validateReminderInput({ kind: "medication", label: "x", time: "08:00", days: [7] }).ok, false)
  assert.equal(validateReminderInput({ kind: "medication", label: "x".repeat(121), time: "08:00", days: [1] }).ok, false)
})

test("add, list, and remove reminders round-trip through storage", () => {
  const storage = memoryStorage()
  const result = validateReminderInput({ kind: "medication", label: "Naltrexone", time: "07:00", days: [0, 6] })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const reminder = addReminder(storage, result.value, NOW)
  assert.ok(reminder)
  assert.equal(readReminders(storage).reminders.length, 1)
  assert.equal(removeReminder(storage, reminder!.id), true)
  assert.equal(removeReminder(storage, reminder!.id), false)
  assert.equal(readReminders(storage).reminders.length, 0)
})

test("reminder count is bounded", () => {
  const storage = memoryStorage()
  const result = validateReminderInput({ kind: "medication", label: "Vitamin D", time: "07:00", days: [1] })
  assert.equal(result.ok, true)
  if (!result.ok) return
  let last: string | null = null
  for (let i = 0; i < MEDICATION_REMINDER_MAX + 3; i += 1) {
    const r = addReminder(storage, { ...result.value, label: `Item ${i}` }, NOW)
    last = r?.id ?? last
  }
  assert.equal(readReminders(storage).reminders.length, MEDICATION_REMINDER_MAX)
})

test("next occurrence for weekly anchors lands on the right weekday", () => {
  const storage = memoryStorage()
  const result = validateReminderInput({ kind: "medication", label: "Weekly shot", time: "09:00", days: [5] }) // Friday
  assert.equal(result.ok, true)
  if (!result.ok) return
  const reminder = addReminder(storage, result.value, NOW)!
  const next = nextOccurrence(reminder, NOW)
  assert.ok(next)
  const day = new Date(next!).getUTCDay()
  assert.equal(day, 5)
  assert.ok(Date.parse(next!) >= Date.parse(NOW))
})

test("one-shot appointment expires after its date", () => {
  const storage = memoryStorage()
  const result = validateReminderInput({ kind: "appointment", label: "Past visit", time: "09:00", days: [], date: "2026-10-01T09:00:00.000Z" })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const reminder = addReminder(storage, result.value, NOW)!
  assert.equal(nextOccurrence(reminder, NOW), null)
})

test("dueReminders respects the lead window", () => {
  const storage = memoryStorage()
  const mk = (label: string, time: string, days: number[]) => {
    const result = validateReminderInput({ kind: "medication", label, time, days })
    if (!result.ok) throw new Error("bad input")
    return addReminder(storage, result.value, NOW)!
  }
  const soon = mk("Soon", "13:15", [3]) // due in 15 minutes (Wed)
  const later = mk("Later", "18:00", [3])
  const weeklyOff = mk("Off-day", "13:10", [4]) // Thursday, not due
  assert.deepEqual(dueReminders(readReminders(storage).reminders, NOW, 30).map((r) => r.id), [soon.id])
  assert.deepEqual(dueReminders(readReminders(storage).reminders, NOW, 360).map((r) => r.id).sort(), [soon.id, later.id].sort())
  assert.equal(weeklyOff.id !== soon.id, true)
})

test("confirmations append to a plain capped log only", () => {
  const storage = memoryStorage()
  const result = validateReminderInput({ kind: "medication", label: "Naltrexone", time: "07:00", days: [1] })
  if (!result.ok) return
  const reminder = addReminder(storage, result.value, NOW)!
  assert.equal(confirmReminder(storage, reminder.id, NOW), true)
  assert.equal(confirmReminder(storage, "missing", NOW), false)
  const state = readReminders(storage)
  assert.equal(state.confirmations.length, 1)
  assert.deepEqual(Object.keys(state.confirmations[0]).sort(), ["at", "reminderId"])
})

test("corrupt storage reads as empty", () => {
  const storage = memoryStorage()
  storage.setItem("narcoguard_medication_reminders_v1", "{not json")
  assert.deepEqual(readReminders(storage).reminders, [])
})
