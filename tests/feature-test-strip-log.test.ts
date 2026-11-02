import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { MAX_ENTRIES, RESULT_ADVICE, addEntry, countResults, normalizeEntries, parseStoredLog, removeEntry } from "../lib/test-strip-log"

const entry = (id: string, date: string, result: "positive" | "negative" | "unclear" = "positive") => ({ id, date, kind: "fentanyl" as const, result })

test("the log is off until turned on, and corrupt storage never crashes", () => {
  assert.equal(parseStoredLog(null), null)
  assert.deepEqual(parseStoredLog("[]"), [])
  assert.deepEqual(parseStoredLog("not json"), [])
})

test("malformed entries are dropped, notes trimmed, newest first, capped", () => {
  const raw = [entry("a", "2026-11-01"), { id: "b", date: "yesterday", kind: "fentanyl", result: "positive" }, { ...entry("c", "2026-11-02"), note: `  ${"x".repeat(200)} ` }, { id: "d", date: "2026-11-02", kind: "heroin", result: "positive" }]
  const out = normalizeEntries(raw)
  assert.deepEqual(out.map((e) => e.id), ["c", "a"])
  assert.equal(out[0].note?.length, 80)
  const many = Array.from({ length: 70 }, (_, i) => entry(`e${i}`, "2026-10-01"))
  assert.equal(normalizeEntries(many).length, MAX_ENTRIES)
})

test("add, remove and count are descriptive", () => {
  let log = addEntry([], entry("a", "2026-11-01", "negative"))
  log = addEntry(log, entry("b", "2026-11-02", "positive"))
  assert.deepEqual(countResults(log), { positive: 1, negative: 1, unclear: 0, total: 2 })
  assert.deepEqual(removeEntry(log, "a").map((e) => e.id), ["b"])
})

test("a negative result is never called safe, and nothing leaves the device", () => {
  assert.match(RESULT_ADVICE.negative, /doesn't mean it's safe/)
  const component = readFileSync("components/harm-reduction/test-strip-log.tsx", "utf8")
  assert.doesNotMatch(component, /fetch\(|sendBeacon|XMLHttpRequest/)
  assert.match(component, /no app PIN yet/)
  assert.match(component, /Erase my whole log/)
})
