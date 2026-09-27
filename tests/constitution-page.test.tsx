import { test } from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import React from "react"
import ConstitutionPage from "../app/constitution/page"

test("the founding draft offers structured, nonbinding public submissions", () => {
  const html = renderToStaticMarkup(<ConstitutionPage />)
  for (const action of ["Support", "Object", "Propose Change", "Submit Evidence", "Identify Harm", "Constitutional Challenge"]) {
    assert.ok(html.includes(action), `${action} must be discoverable`)
  }
  assert.match(html, /template=constitution\.yml/)
  assert.match(html, /FOUNDING DRAFT — NOT YET RATIFIED/)
  assert.match(html, /submissions are advisory/i)
})
