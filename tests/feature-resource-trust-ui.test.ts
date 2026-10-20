import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("help page states resource freshness, privacy and offline limits before search", async () => {
  const page = await readFile(new URL("../app/help/page.tsx", import.meta.url), "utf8")
  const panel = await readFile(new URL("../components/resources/resource-trust-panel.tsx", import.meta.url), "utf8")
  assert.match(page, /<ResourceTrustPanel \/>/)
  assert.ok(page.indexOf("<ResourceTrustPanel />") < page.indexOf("<NeedsFinder />"))
  assert.match(panel, /Public-directory hours, eligibility and availability can change/)
  assert.match(panel, /does not require an account/)
  assert.match(panel, /only shares location after you choose/)
  assert.match(panel, /You are offline/)
  assert.match(panel, /href="tel:211"/)
})
