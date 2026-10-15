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

test("service-worker shell version is bumped for the watch visual refresh", () => {
  const sw = read("public/sw.js")
  assert.match(sw, /narcoguard-shell-v13/)
})


test("service-worker registrations bypass HTTP cache so installed PWAs see new shells", () => {
  const component = read("components/pwa/service-worker-register.tsx")
  const layout = read("app/layout.tsx")
  assert.match(component, /updateViaCache: "none"/)
  assert.match(layout, /updateViaCache: "none"/)
})

test("Rev 5 watch blueprint cache entries match the current visual release", () => {
  const sw = read("public/sw.js")
  assert.match(sw, /ng46-rev5-blueprint\.svg\?rev=5-2026-10-14/)
  assert.match(sw, /ng40-rev5-blueprint\.svg\?rev=5-2026-10-14/)
  assert.doesNotMatch(sw, /rev=5-2026-10-13/)
})
