import assert from "node:assert/strict"
import { test } from "node:test"
import { extractLinks, isDead } from "../tools/link-check.mjs"

test("extracts external https links and skips our own site, templates and API endpoints", () => {
  const source = `
    { url: "https://www.cdc.gov/stop-overdose/caring/naloxone.html" },
    see https://findtreatment.gov. and (https://988lifeline.org)
    "https://www.narcoguard.app/bystander" \`https://\${host}/x\` https://api.example.net/v1 https://overpass-api.de/api/interpreter
    { url: "https://www.cdc.gov/stop-overdose/caring/naloxone.html" }`
  assert.deepEqual(extractLinks(source), [
    "https://www.cdc.gov/stop-overdose/caring/naloxone.html",
    "https://findtreatment.gov",
    "https://988lifeline.org",
  ])
})

test("only gone or failing links count as dead; silence and bot blocks do not", () => {
  for (const status of [404, 410, 500, 503]) assert.equal(isDead(status), true, String(status))
  for (const status of [0, 200, 301, 401, 403, 405, 429]) assert.equal(isDead(status), false, String(status))
})
