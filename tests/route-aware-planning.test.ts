import { strict as assert } from "node:assert"
import { test } from "node:test"
import type { PlanItem } from "../lib/guardian-stability"
import type { NearbyResource } from "../lib/resource-finder"
import {
  extractPlanZip,
  nextRouteAwarePlan,
  rankResourcesForPlan,
  routeTimingFit,
} from "../lib/route-aware-planning"

test("extractPlanZip reads only a five-digit ZIP from user-entered plan text", () => {
  assert.equal(extractPlanZip("Clinic, Vestal NY 13850"), "13850")
  assert.equal(extractPlanZip("Call provider at 607-555-1212"), null)
  assert.equal(extractPlanZip(undefined), null)
})

test("nextRouteAwarePlan picks the earliest future appointment with ZIP and attached need", () => {
  const plan: PlanItem[] = [
    { id: "later", date: "2026-10-14", title: "Treatment", done: false, kind: "appointment", time: "10:00", location: "13850", need: "food" },
    { id: "task", date: "2026-10-13", title: "Laundry", done: false, kind: "task", location: "13850", need: "laundry" },
    { id: "next", date: "2026-10-13", title: "Appointment", done: false, kind: "appointment", time: "14:00", location: "Vestal NY 13850", need: "connection" },
    { id: "missing-zip", date: "2026-10-13", title: "Other", done: false, kind: "appointment", time: "12:00", location: "Main Street", need: "food" },
  ]
  assert.equal(nextRouteAwarePlan(plan, { date: "2026-10-13", time: "09:00" })?.id, "next")
})

test("route-aware ranking prefers listed-hours fit before distance", () => {
  const plan: PlanItem = {
    id: "a",
    date: "2026-10-13",
    title: "Appointment",
    done: false,
    kind: "appointment",
    time: "10:00",
    location: "13850",
    need: "food",
  }
  const alwaysOpen: NearbyResource = {
    name: "Always",
    kind: "food",
    hours: "24/7",
    distanceMiles: 4,
    source: "OpenStreetMap contributors",
  }
  const closed: NearbyResource = {
    name: "Closed",
    kind: "food",
    hours: "18:00-20:00",
    distanceMiles: 1,
    source: "OpenStreetMap contributors",
  }
  assert.equal(routeTimingFit(alwaysOpen, plan), "around")
  assert.equal(routeTimingFit(closed, plan), "closed-around")
  assert.deepEqual(rankResourcesForPlan([closed, alwaysOpen], plan).map((row) => row.name), ["Always", "Closed"])
})

test("unsupported or absent hours remain unknown rather than guessed", () => {
  const plan: PlanItem = {
    id: "a",
    date: "2026-10-13",
    title: "Appointment",
    done: false,
    kind: "appointment",
    time: "10:00",
    location: "13850",
    need: "food",
  }
  const resource: NearbyResource = {
    name: "Unknown",
    kind: "food",
    hours: "sunrise-sunset",
    source: "OpenStreetMap contributors",
  }
  assert.equal(routeTimingFit(resource, plan), "unknown")
})
