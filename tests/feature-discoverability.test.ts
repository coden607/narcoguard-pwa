import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { PUBLIC_ROUTES } from "../lib/site-url"

const NEW_PAGES = ["/naloxone-card", "/treatment", "/prevention", "/check-on-me", "/debrief", "/test-strips"]

test("new public pages are in the sitemap and linked from Stay Safer", () => {
  const saferUse = readFileSync("app/safer-use/page.tsx", "utf8")
  for (const route of NEW_PAGES) {
    assert.ok((PUBLIC_ROUTES as readonly string[]).includes(route), route)
    assert.match(saferUse, new RegExp(`href="${route}"`), route)
  }
})

test("the check-on-me timer and pharmacy card are precached for offline use", () => {
  const worker = readFileSync("public/sw.js", "utf8")
  assert.match(worker, /"\/check-on-me"/)
  assert.match(worker, /"\/naloxone-card"/)
})
