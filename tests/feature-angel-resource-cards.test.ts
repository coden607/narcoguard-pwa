import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { AngelResourceCards } from "../components/ai/angel-resource-cards"
import type { AngelResources } from "../lib/angel-resources"

const resources: AngelResources = {
  status: "partial",
  groups: [
    { kind: "food", label: "Free/community food", shortLabel: "Free food", status: "ok", fallback: [], results: [
      { name: "Hope Kitchen", kind: "food", lat: 42.1, lon: -75.9, distanceMiles: 0.4, phone: "(607) 555-0100", hours: "Mo-Fr 09:00-17:00", source: "OpenStreetMap contributors" },
      { name: "No Hours Pantry", kind: "food", distanceMiles: 2, source: "OpenStreetMap contributors" },
    ] },
    { kind: "shelter", label: "Shelter", shortLabel: "Shelter", status: "ok", fallback: [{ title: "Shelter directory", url: "https://example.org/shelters" }], results: [] },
    { kind: "treatment", label: "Treatment", shortLabel: "Treatment", status: "unavailable", fallback: [], results: [] },
  ],
}

const render = () => renderToStaticMarkup(React.createElement(AngelResourceCards, { resources }))

test("a resource card shows name, distance, hours, source, call first, and Call and Directions buttons", () => {
  const html = render()
  assert.match(html, /Hope Kitchen/)
  assert.match(html, /0\.4 mi/)
  assert.match(html, /Listed hours \(local time there\): /)
  assert.match(html, /href="tel:6075550100"/)
  assert.match(html, /Call \(607\) 555-0100/)
  assert.match(html, /href="https:\/\/www\.google\.com\/maps\/dir\/\?api=1&amp;destination=42\.10000,-75\.90000"/)
  assert.match(html, /opens Google Maps/)
  assert.match(html, /Source: OpenStreetMap contributors\. Hours, openings and eligibility are not confirmed; call first\./)
  assert.equal((html.match(/data-testid="angel-resource-card"/g) ?? []).length, 2)
})

test("unknown hours and missing coordinates stay explicit instead of guessing", () => {
  const html = render()
  const pantry = html.slice(html.indexOf("No Hours Pantry"))
  assert.match(pantry, /Hours unknown/)
  assert.equal((html.match(/data-testid="angel-directions"/g) ?? []).length, 1, "no Directions without coordinates")
  // The place may be in another time zone than the phone, so the card never claims open or closed.
  assert.doesNotMatch(html, /Open now|Closed now/)
})

test("empty and unavailable searches keep directory links and Call 211", () => {
  const html = render()
  assert.match(html, /No listing found nearby\./)
  assert.match(html, /This search is not available right now\./)
  assert.match(html, /Shelter directory/)
  assert.equal((html.match(/href="tel:211"/g) ?? []).length, 2)
})

test("cards are text-first, touch-sized and wrap on narrow screens", () => {
  const html = render()
  assert.doesNotMatch(html, /<img|<svg|animate-/)
  assert.match(html, /min-h-11/)
  assert.match(html, /break-words/)
  assert.match(html, /flex-wrap/)
  const chat = readFileSync("components/ai/angel-ai.tsx", "utf8")
  assert.match(chat, /<AngelResourceCards resources=\{message\.resources\} \/>/)
})
