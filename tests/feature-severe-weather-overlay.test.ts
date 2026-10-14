import assert from "node:assert/strict"
import { test } from "node:test"
import type { KnownResource } from "../lib/resource-inventory"
import {
  isActiveAlert,
  isValidWeatherAlert,
  overlayForAlert,
  proposeWeatherWatch,
  WEATHER_CENTER_KINDS,
  WEATHER_OVERLAY_DISCLAIMER,
  type WeatherAlert,
} from "../lib/severe-weather-overlay"

const NOW = "2026-07-14T15:00:00.000Z"

const heatAlert: WeatherAlert = {
  kind: "heat",
  severity: "warning",
  regionLabel: "Excessive Heat Warning",
  startsAt: "2026-07-14T00:00:00.000Z",
  endsAt: "2026-07-16T00:00:00.000Z",
  source: "NWS",
}

const resource = (key: string, zip: string, kind: string, lastSeenAt = "2026-07-01T00:00:00.000Z"): KnownResource => ({
  key,
  zip,
  resource: { name: `Site ${key}`, kind: kind as never, source: "OpenStreetMap contributors" },
  firstSeenAt: "2026-06-01T00:00:00.000Z",
  lastSeenAt,
  lastLookupAt: "2026-07-01T00:00:00.000Z",
  lastReturned: true,
})

test("center kind mapping covers cooling, warming, shelter, and indoor air quality", () => {
  assert.ok(WEATHER_CENTER_KINDS.heat.includes("library"))
  assert.ok(WEATHER_CENTER_KINDS.cold.includes("shelter"))
  assert.deepEqual(WEATHER_CENTER_KINDS.storm, ["shelter", "emergency"])
  assert.ok(WEATHER_CENTER_KINDS["air-quality"].includes("library"))
  assert.equal(WEATHER_CENTER_KINDS.heat.includes("jobs"), false)
})

test("alert validation rejects malformed windows and unknown kinds", () => {
  assert.equal(isValidWeatherAlert(heatAlert), true)
  assert.equal(isValidWeatherAlert({ ...heatAlert, kind: "flood" }), false)
  assert.equal(isValidWeatherAlert({ ...heatAlert, severity: "extreme" }), false)
  assert.equal(isValidWeatherAlert({ ...heatAlert, endsAt: heatAlert.startsAt }), false)
  assert.equal(isValidWeatherAlert({ ...heatAlert, source: "" }), false)
})

test("active window is inclusive of start and end", () => {
  assert.equal(isActiveAlert(heatAlert, "2026-07-14T00:00:00.000Z"), true)
  assert.equal(isActiveAlert(heatAlert, "2026-07-16T00:00:00.000Z"), true)
  assert.equal(isActiveAlert(heatAlert, "2026-07-17T00:00:00.000Z"), false)
  assert.equal(isActiveAlert(heatAlert, "2026-07-13T23:59:59.000Z"), false)
})

test("overlay filters by ZIP and alert-appropriate kinds, newest first", () => {
  const inventory = [
    resource("old", "13201", "library", "2026-06-01T00:00:00.000Z"),
    resource("new", "13201", "community", "2026-07-02T00:00:00.000Z"),
    resource("jobs", "13201", "jobs", "2026-07-03T00:00:00.000Z"),
    resource("other-zip", "13202", "library"),
  ]
  const overlay = overlayForAlert(heatAlert, inventory, { zip: "13201", now: NOW })
  assert.equal(overlay.active, true)
  assert.deepEqual(overlay.matches.map((m) => m.key), ["new", "old"])
})

test("overlay never claims availability: no confirmed/open-now wording anywhere", () => {
  const inventory = [resource("a", "13201", "library")]
  const overlay = overlayForAlert(heatAlert, inventory, { zip: "13201", now: NOW })
  const serialized = JSON.stringify(overlay).toLowerCase()
  for (const banned of ["confirmed", "open now", "available now", "has space", "staffed"]) {
    assert.equal(serialized.includes(banned), false, `output must not claim "${banned}"`)
  }
  assert.equal(overlay.disclaimer, WEATHER_OVERLAY_DISCLAIMER)
})

test("staleness is visible on every match", () => {
  const inventory = [resource("a", "13201", "shelter", "2026-05-30T00:00:00.000Z")]
  const overlay = overlayForAlert({ ...heatAlert, kind: "cold" }, inventory, { zip: "13201", now: NOW })
  assert.equal(overlay.matches[0].lastSeenAt, "2026-05-30T00:00:00.000Z")
  assert.equal(typeof overlay.matches[0].source, "string")
})

test("inactive alert returns an empty overlay without escalation", () => {
  const inventory = [resource("a", "13201", "library")]
  const overlay = overlayForAlert(heatAlert, inventory, { zip: "13201", now: "2026-08-01T00:00:00.000Z" })
  assert.equal(overlay.active, false)
  assert.equal(overlay.matches.length, 0)
  assert.equal(overlay.escalation, null)
})

test("emergency alert with zero matches escalates with fallback contacts", () => {
  const fallbacks = [{ label: "United Way 211", phone: "211" }]
  const overlay = overlayForAlert(
    { ...heatAlert, severity: "emergency" },
    [],
    { zip: "13201", now: NOW, fallbacks },
  )
  assert.equal(overlay.escalation !== null, true)
  assert.match(overlay.escalation!.reason, /Excessive Heat Warning/)
  assert.match(overlay.escalation!.reason, /no known/)
  assert.deepEqual(overlay.escalation!.fallbacks, fallbacks)
})

test("warning alert with zero matches does not escalate", () => {
  const overlay = overlayForAlert(heatAlert, [], { zip: "13201", now: NOW })
  assert.equal(overlay.active, true)
  assert.equal(overlay.escalation, null)
})

test("invalid ZIP yields an empty inactive overlay", () => {
  const overlay = overlayForAlert(heatAlert, [resource("a", "13201", "library")], { zip: "1320", now: NOW })
  assert.equal(overlay.active, false)
  assert.equal(overlay.matches.length, 0)
})

test("weather watch proposal mirrors alert kinds and expires with the alert", () => {
  const proposal = proposeWeatherWatch(heatAlert, { zip: "13201", now: NOW })
  assert.deepEqual(proposal?.kinds, WEATHER_CENTER_KINDS.heat)
  assert.equal(proposal?.zip, "13201")
  assert.equal(proposal?.until, heatAlert.endsAt)
  assert.match(proposal?.reason ?? "", /Excessive Heat Warning/)
})

test("weather watch proposal abstains for inactive or invalid alerts", () => {
  assert.equal(proposeWeatherWatch(heatAlert, { zip: "13201", now: "2026-08-01T00:00:00.000Z" }), null)
  assert.equal(proposeWeatherWatch({ ...heatAlert, kind: "flood" as never }, { zip: "13201", now: NOW }), null)
})

test("matches are bounded by maxMatches", () => {
  const inventory = Array.from({ length: 15 }, (_, i) => resource(`r${i}`, "13201", "library"))
  const overlay = overlayForAlert(heatAlert, inventory, { zip: "13201", now: NOW, maxMatches: 5 })
  assert.equal(overlay.matches.length, 5)
})
