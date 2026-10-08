import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { ANGEL_SYSTEM_PROMPT } from "../lib/angel-ai"
import { GUIDES } from "../lib/response-guides"
import {
  BENEFIT_LINKS, CRISIS_LINES, MEETING_FINDERS, NALOXONE_SOURCES, NEVER_USE_ALONE, TEST_STRIP_FACTS, TEST_STRIP_SOURCES, directionsUrl,
} from "../lib/safer-use"

test("every help line dials digits only and cites an https source", () => {
  for (const line of CRISIS_LINES) {
    assert.match(line.tel, /^\d{3,11}$/, line.name)
    assert.ok(line.source.startsWith("https://"), line.name)
  }
  assert.equal(NEVER_USE_ALONE.tel, "18004843731")
  assert.equal(CRISIS_LINES[0].tel, "911", "911 is listed first")
})

test("every link is https and unique", () => {
  const links = [...NALOXONE_SOURCES, ...TEST_STRIP_SOURCES, ...MEETING_FINDERS, ...BENEFIT_LINKS]
  for (const link of links) assert.ok(link.url.startsWith("https://") && link.title && link.what, link.title)
  assert.equal(new Set(links.map((link) => link.url)).size, links.length)
})

test("test strip guidance never calls a negative result safe", () => {
  const text = TEST_STRIP_FACTS.join(" ")
  assert.match(text, /does not mean the drug is safe/)
  assert.match(text, /give naloxone anyway/)
  assert.doesNotMatch(text, /\b(is|are) safe to use\b/i)
})

test("directions send only the listing's rounded coordinates and reject bad input", () => {
  assert.equal(directionsUrl(42.0987654, -75.9180001), "https://www.google.com/maps/dir/?api=1&destination=42.09877,-75.91800")
  assert.equal(directionsUrl(undefined, -75), undefined)
  assert.equal(directionsUrl(Number.NaN, 0), undefined)
  assert.equal(directionsUrl(91, 0), undefined)
  assert.equal(directionsUrl(0, 181), undefined)
})

test("the offline page carries every overdose step and the emergency numbers", () => {
  const html = readFileSync(new URL("../public/offline.html", import.meta.url), "utf8")
  for (const step of GUIDES.naloxone.steps) assert.ok(html.includes(step.title), `offline page is missing "${step.title}"`)
  for (const tel of ["tel:911", "tel:18004843731", "tel:988", "tel:211"]) assert.ok(html.includes(`href="${tel}"`), tel)
})

test("the service worker precaches the offline page and the safety pages", () => {
  const sw = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8")
  for (const path of ["/offline.html", "/safer-use", "/help", "/ar"]) assert.ok(sw.includes(`"${path}"`), path)
})

test("Angel knows Never Use Alone and never gives dosing advice", () => {
  assert.match(ANGEL_SYSTEM_PROMPT, /1-800-484-3731/)
  assert.match(ANGEL_SYSTEM_PROMPT, /negative result never means a drug is safe/)
  assert.match(ANGEL_SYSTEM_PROMPT, /Never give dosing advice/)
})
