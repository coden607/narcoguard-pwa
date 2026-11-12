import assert from "node:assert/strict"
import { test } from "node:test"
import { showWakeNotification } from "../lib/wake-notification"

test("installed mobile apps use service-worker notifications before the desktop constructor", async () => {
  let shown = 0
  let constructed = 0
  let destination: string | undefined
  assert.equal(await showWakeNotification({ permission: "granted", registration: async () => ({ showNotification: async (_title, options) => { destination = options?.data?.url; shown++ } }), create: () => { constructed++ } }), true)
  assert.equal(shown, 1)
  assert.equal(constructed, 0)
  assert.equal(destination, "/daily-life")
})

test("denied permission is never requested automatically and unavailable notifications do not crash reminders", async () => {
  let touched = false
  assert.equal(await showWakeNotification({ permission: "denied", registration: async () => { touched = true; return undefined }, create: () => { touched = true } }), false)
  assert.equal(touched, false)
  assert.equal(await showWakeNotification({ permission: "granted", registration: async () => undefined, create: () => { throw new Error("Constructor unsupported on mobile") } }), false)
})

test("desktop notifications work without an installed service worker", async () => {
  let created = 0
  assert.equal(await showWakeNotification({ permission: "granted", registration: async () => undefined, create: () => { created++ } }), true)
  assert.equal(created, 1)
})
