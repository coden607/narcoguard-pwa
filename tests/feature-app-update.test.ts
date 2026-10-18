import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ServiceWorkerRegister } from "../components/pwa/service-worker-register"

test("app status exposes the loaded build even before a version check finishes", () => {
  const html = renderToStaticMarkup(createElement(ServiceWorkerRegister, { initialVersion: "abc1234" }))
  assert.match(html, /Build abc1234/)
  assert.match(html, /Check for updates/)
  assert.doesNotMatch(html, /Update now/)
})
