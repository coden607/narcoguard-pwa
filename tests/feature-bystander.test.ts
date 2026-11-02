import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { OVERDOSE_STEPS } from "../components/emergency/overdose-steps"

test("the modal and the bystander page share one list of steps", () => {
  const modal = readFileSync("components/emergency/emergency-modal.tsx", "utf8")
  assert.match(modal, /from "@\/components\/emergency\/overdose-steps"/)
  assert.doesNotMatch(modal, /const OVERDOSE_STEPS/)
  assert.match(readFileSync("app/bystander/page.tsx", "utf8"), /OVERDOSE_STEPS\.map/)
  assert.match(OVERDOSE_STEPS[0], /^Call 911/)
})

test("the QR code is a static SVG", () => {
  assert.match(readFileSync("public/bystander-qr.svg", "utf8"), /<svg[^>]*viewBox="0 0 33 33"/)
})
