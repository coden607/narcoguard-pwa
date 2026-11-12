import assert from "node:assert/strict"
import { test } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { SavedSetupDetails } from "../components/contacts/saved-setup-details"
import { parseUserPreferences } from "../lib/user-preferences"

test("setup contacts and naloxone locations remain usable without the text service", () => {
  const preferences = parseUserPreferences(JSON.stringify({ emergencyContacts: [{ id: "friend", name: "Test Friend", phone: "+1 (607) 555-0100", relationship: "Friend", notifyMethod: "call" }], naloxoneLocations: [{ id: "kit", description: "Naloxone kit", location: "Entry shelf", instructions: "Top drawer" }] }))
  const html = renderToStaticMarkup(createElement(SavedSetupDetails, { preferences, onEdit: () => {} }))
  assert.match(html, /href="tel:\+16075550100"/)
  assert.match(html, /Call Test Friend/)
  assert.match(html, /Entry shelf/)
  assert.match(html, /Top drawer/)
  assert.match(html, /does not enroll anyone in text alerts/)
})

test("empty setup offers editing without inventing contacts or supply locations", () => {
  const html = renderToStaticMarkup(createElement(SavedSetupDetails, { preferences: parseUserPreferences(null), onEdit: () => {} }))
  assert.match(html, /No call contacts saved/)
  assert.match(html, /No naloxone locations saved/)
  assert.doesNotMatch(html, /href="tel:/)
})
