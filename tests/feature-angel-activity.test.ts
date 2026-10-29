import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { angelActivitySteps, formatSeconds, searchStepLabels } from "../lib/angel-activity"
import type { AngelResources } from "../lib/angel-resources"

const resources: AngelResources = {
  status: "partial",
  groups: [
    { kind: "food", label: "Free/community food", shortLabel: "Free food", status: "ok", fallback: [], results: [
      { name: "Kitchen A", kind: "food", lat: 42.1, lon: -75.9, address: "1 Main St", distanceMiles: 0.4, source: "OpenStreetMap contributors" },
      { name: "Kitchen B", kind: "food", lat: 42.2, lon: -75.8, distanceMiles: 1.2, source: "OpenStreetMap contributors" },
    ] },
    { kind: "shelter", label: "Shelter", shortLabel: "Shelter", status: "ok", fallback: [], results: [], widenedMiles: 25 },
    { kind: "treatment", label: "Treatment", shortLabel: "Treatment", status: "unavailable", fallback: [], results: [] },
  ],
}

test("waiting shows an honest in-progress step with elapsed time", () => {
  const steps = angelActivitySteps({ phase: "waiting", maySearch: true, elapsedSeconds: 3.7 })
  assert.equal(steps.length, 2)
  assert.equal(steps[1].state, "active")
  assert.match(steps[1].label, /may search public directories/)
  assert.match(steps[1].label, /3 seconds so far/)
  assert.match(angelActivitySteps({ phase: "waiting", maySearch: false, elapsedSeconds: 1 })[1].label, /^Angel is writing a reply \(1 second so far\)$/)
})

test("stopped and failed states say plainly that nothing was received", () => {
  const stopped = angelActivitySteps({ phase: "stopped", maySearch: true, elapsedSeconds: 8 }).at(-1)!
  assert.equal(stopped.state, "stopped")
  assert.match(stopped.label, /Stopped by you after 8 seconds\. Nothing from this request was received/)
  const failed = angelActivitySteps({ phase: "failed", maySearch: false, elapsedSeconds: 0 }).at(-1)!
  assert.equal(failed.state, "failed")
  assert.match(failed.label, /No reply confirmed/)
})

test("a finished request lists each search with counts and keeps unknown states explicit", () => {
  assert.deepEqual(searchStepLabels(resources), [
    "Free food: 2 listings found",
    "Shelter: no listing found (searched up to 25 miles)",
    "Treatment: search not available right now",
  ])
  const steps = angelActivitySteps({ phase: "done", maySearch: true, elapsedSeconds: 12, resources })
  assert.equal(steps.at(-1)!.label, "Reply received in 12 seconds")
  assert.ok(steps.every((step) => step.state === "done"))
  assert.deepEqual(searchStepLabels(undefined), [])
  assert.equal(formatSeconds(-4), "0 seconds")
})

test("the activity log never carries coordinates, addresses, ZIP codes or message text", () => {
  const text = JSON.stringify(angelActivitySteps({ phase: "done", maySearch: true, elapsedSeconds: 2, resources }))
  assert.doesNotMatch(text, /42\.1|-75\.9|Main St|Kitchen|\b\d{5}\b/)
})

test("the Angel chat wires a Stop button that aborts only the request in flight and keeps the message", () => {
  const chat = readFileSync("components/ai/angel-ai.tsx", "utf8")
  const panel = readFileSync("components/ai/angel-activity.tsx", "utf8")
  assert.match(chat, /stoppedRef\.current = true\s*\n\s*requestRef\.current\?\.abort\(\)/)
  assert.match(chat, /<AngelActivity[\s\S]*onStop=\{stopRequest\}/)
  assert.match(chat, /Your message is kept below; retry or cancel it\./)
  // Stop is a real button (keyboard reachable), at least 44px tall, and the log is announced politely.
  assert.match(panel, /<Button type="button"[^>]*className="min-h-11"[^>]*onClick=\{onStop\}/)
  assert.match(panel, /role="status" aria-live="polite"/)
  assert.match(panel, /aria-label="What Angel is doing"/)
  assert.match(panel, /sr-only/)
  // Narrow screens and large text wrap instead of overflowing; nothing animates (reduced motion).
  assert.match(panel, /flex-wrap/)
  assert.match(panel, /break-words/)
  assert.doesNotMatch(panel, /animate-/)
  // Offline, no attempt starts (beginAngelAttempt refuses), so the log never claims work that is not happening.
  assert.ok(chat.indexOf("beginAngelAttempt(pendingRef.current, navigator.onLine)") < chat.indexOf('setActivity({ phase: "waiting"'))
  assert.match(chat, /const turn = beginAngelAttempt\(pendingRef\.current, navigator\.onLine\)\s*\n\s*if \(!turn\) return null/)
  // The emergency links stay above the activity log.
  assert.ok(chat.indexOf('href="tel:911"') < chat.indexOf("<AngelActivity"))
})
