import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("PWA checks the uncached deployment version and shows an update notice", () => {
  const component = read("components/pwa/service-worker-register.tsx")
  assert.match(component, /\/api\/app-version/)
  assert.match(component, /cache: "no-store"/)
  assert.match(component, /NarcoGuard update available/)
  assert.match(component, /Update now/)
  assert.match(component, /pwa-update-notice/)
})

test("device update notification is only sent when permission is already granted", () => {
  const component = read("components/pwa/service-worker-register.tsx")
  assert.match(component, /Notification\.permission !== "granted"/)
  assert.match(component, /showNotification\("NarcoGuard update available"/)
  assert.doesNotMatch(component, /Notification\.requestPermission/)
})

test("deployment version endpoint is dynamic and non-cacheable", () => {
  const route = read("app/api/app-version/route.ts")
  assert.match(route, /VERCEL_GIT_COMMIT_SHA/)
  assert.match(route, /force-dynamic/)
  assert.match(route, /Cache-Control/)
  assert.match(route, /no-store/)
})

test("service-worker shell version is bumped for the update notice release", () => {
  const sw = read("public/sw.js")
  assert.match(sw, /narcoguard-shell-v8/)
})
