import { strict as assert } from "node:assert"
import { test } from "node:test"
import { readFile } from "node:fs/promises"
import { EMERGENCY_PRIMARY_PATHS, isEmergencyPrimary } from "../lib/emergency-routes"

test("funding banner is left off pages where Call 911 comes first (#314)", () => {
  for (const path of ["/ar", "/911-script", "/bystander", "/rescue-breathing", "/aftercare"]) {
    assert.ok(EMERGENCY_PRIMARY_PATHS.includes(path as (typeof EMERGENCY_PRIMARY_PATHS)[number]), path)
    assert.equal(isEmergencyPrimary(path), true, path)
  }
  assert.equal(isEmergencyPrimary("/ar/guide"), true)
})

test("funding banner stays on every other page (#314)", () => {
  for (const path of ["/", "/help", "/fund", "/safer-use", "/aftercare-tips", "/area", "/bystanders"]) {
    assert.equal(isEmergencyPrimary(path), false, path)
  }
})

test("error and not-found screens hide the banner wherever they appear (#314)", async () => {
  const fallback = await readFile(new URL("../components/common/emergency-fallback.tsx", import.meta.url), "utf8")
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8")
  const chrome = await readFile(new URL("../components/site-chrome.tsx", import.meta.url), "utf8")
  assert.match(fallback, /data-emergency-primary/)
  assert.match(chrome, /isEmergencyPrimary\(pathname\)/)
  assert.match(chrome, /data-funding-banner/)
  assert.match(css, /:has\(\[data-emergency-primary\]\) \[data-funding-banner\] \{ display: none; \}/)
})
