import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { test } from "node:test"
import { EMERGENCY_OFFLINE_PATHS } from "../lib/emergency-precache"
import { PUBLIC_ROUTES } from "../lib/site-url"

const worker = readFileSync("public/sw.js", "utf8")

function appShell(): string[] {
  const block = worker.match(/const APP_SHELL = \[([\s\S]*?)\];/)
  assert.ok(block, "public/sw.js must declare const APP_SHELL = [...]")
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1])
}

test("every emergency path is in the service-worker precache", () => {
  const shell = appShell()
  for (const path of EMERGENCY_OFFLINE_PATHS) assert.ok(shell.includes(path), `${path} is missing from APP_SHELL in public/sw.js`)
})

test("precached pages are public routes and precached files exist", () => {
  const routes = PUBLIC_ROUTES as readonly string[]
  for (const entry of appShell()) {
    const path = entry.split("?")[0]
    if (path === "/manifest.webmanifest") continue
    if (path.includes(".")) assert.ok(existsSync(`public${path}`), `${entry} is precached but public${path} does not exist`)
    else assert.ok(routes.includes(path), `${path} is precached but not in PUBLIC_ROUTES`)
  }
})

test("offline navigations fall back to an offline page that still offers Call 911", () => {
  assert.match(worker, /caches\.match\("\/offline\.html"\)/)
  assert.match(readFileSync("public/offline.html", "utf8"), /href="tel:911"/)
})
