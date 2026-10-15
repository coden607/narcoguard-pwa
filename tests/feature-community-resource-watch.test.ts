import { strict as assert } from "node:assert"
import { test } from "node:test"
import { readFile } from "node:fs/promises"

test("resource watches include showers and generic push updates", async () => {
  const alerts = await readFile(new URL("../lib/hero-alerts.ts", import.meta.url), "utf8")
  const sw = await readFile(new URL("../public/sw.js", import.meta.url), "utf8")
  const register = await readFile(new URL("../components/pwa/service-worker-register.tsx", import.meta.url), "utf8")
  assert.match(alerts, /"shower"/)
  assert.match(alerts, /Shower \/ hygiene access/)
  assert.match(sw, /narcoguard-shell-v13/)
  assert.match(sw, /resource match/)
  assert.match(register, /registration\.update\(\)/)
})

test("community and resource watch surfaces are present", async () => {
  const community = await readFile(new URL("../app/community/page.tsx", import.meta.url), "utf8")
  const communityApi = await readFile(new URL("../app/api/community/route.ts", import.meta.url), "utf8")
  const resourceWatch = await readFile(new URL("../app/api/resources/watch/route.ts", import.meta.url), "utf8")
  assert.match(community, /NarcoGuard Community/)
  assert.match(community, /Direct messages/)
  assert.match(communityApi, /community_connections/)
  assert.match(communityApi, /community_messages/)
  assert.match(resourceWatch, /resource_watch_subscriptions/)
})

test("Rev 5 funding and modular injector claims stay bounded", async () => {
  const funding = await readFile(new URL("../lib/funding-goal.ts", import.meta.url), "utf8")
  const rev5 = await readFile(new URL("../lib/watch-rev5.ts", import.meta.url), "utf8")
  const watch = await readFile(new URL("../app/watch/page.tsx", import.meta.url), "utf8")
  assert.match(funding, /FUNDING_GOAL = 75_000/)
  assert.match(rev5, /auto-injector-module/)
  assert.match(rev5, /current watch does not inject naloxone/i)
  assert.match(watch, /Modular auto-injector research pod/)
  assert.match(watch, /No NarcoGuard watch currently injects naloxone/)
})
