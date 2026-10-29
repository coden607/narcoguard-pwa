import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { AngelLogChart } from "../components/ai/angel-log-chart"
import { buildAngelLogChart } from "../lib/angel-log-chart"
import { parseAngelLocalCommand } from "../lib/angel-voice-commands"
import type { CheckIn } from "../lib/guardian-stability"

const entries: CheckIn[] = [
  { date: "2026-10-29", needs: {}, meals: [{ id: "a", kind: "lunch" }], sleepHours: 6 },
  { date: "2026-10-27", needs: {}, meals: [{ id: "b", kind: "dinner" }] },
  { date: "2026-10-23", needs: {} },
  { date: "2026-10-22", needs: {}, meals: [{ id: "c", kind: "snack" }] }, // outside the 7-day window
]

test("the chart counts the last 7 days with denominators and never percentages", () => {
  const chart = buildAngelLogChart(entries, "2026-10-29")
  assert.deepEqual(chart.rows, [
    { label: "Days with a check-in", count: 3, of: 7 },
    { label: "Days with a meal logged", count: 2, of: 7 },
    { label: "Days with sleep logged", count: 1, of: 7 },
  ])
  assert.equal(chart.window, "Last 7 days, ending today")
  assert.doesNotMatch(chart.text, /%|percent|streak|missed \d|should/i)
  assert.match(chart.text, /not counted as missed/)
})

test("windows cross month boundaries and an empty log says so without judgement", () => {
  const chart = buildAngelLogChart([{ date: "2026-10-31", needs: {} }, { date: "2026-11-02", needs: {} }], "2026-11-02")
  assert.equal(chart.rows[0].count, 2)
  const empty = buildAngelLogChart([], "2026-10-29")
  assert.equal(empty.empty, true)
  assert.match(empty.text, /Nothing is logged on this phone for the last 7 days\. That is fine; logging is optional\./)
})

test("the chart renders exact counts as text, hides the decorative bars, and does not animate", () => {
  const html = renderToStaticMarkup(React.createElement(AngelLogChart, { chart: buildAngelLogChart(entries, "2026-10-29") }))
  assert.match(html, /<figure/)
  assert.match(html, /Days with a meal logged.*2 of 7 days/)
  assert.match(html, /aria-hidden="true"/)
  assert.match(html, /Stays on this phone; not sent to Angel\./)
  assert.doesNotMatch(html, /%<|animate-|<svg|<img/)
  assert.match(html, /flex-wrap/)
})

test("asking Angel to show logs is a local command, and local messages are never sent to the provider", () => {
  for (const said of ["Show my logs this week", "show my meals", "chart my check-ins for the last 7 days"]) {
    assert.deepEqual(parseAngelLocalCommand(said), { type: "log_chart" }, said)
  }
  assert.equal(parseAngelLocalCommand("show my location"), null)
  const chat = readFileSync("components/ai/angel-ai.tsx", "utf8")
  assert.match(chat, /messages: next\.filter\(\(message\) => !message\.localOnly\)\.slice\(-20\)/)
  assert.match(chat, /local\?\.type === "log_chart"[\s\S]*localOnly: true[\s\S]*return chart\.text/)
})
