import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Watch3D } from "../components/watch/watch-3d"

test("watch remains visible while interactive rendering loads, with inactive 3D controls", () => {
  const html = renderToStaticMarkup(createElement(Watch3D, { selected: null, onSelect: () => {} }))
  assert.match(html, /alt="NG46 titanium and NG40 rose-titanium concept watch board"/)
  assert.match(html, /Open full-size concept watch board/)
  assert.match(html, /Loading 3D model/)
  assert.match(html, /<input[^>]*disabled=""/)
  assert.match(html, /<button[^>]*disabled=""[^>]*>.*?Auto-rotate/)
})
