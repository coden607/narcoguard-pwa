import { expect, test, type Page } from "@playwright/test"

// Emergency screens at small screens and large text (#301). Assertions, not pixel baselines:
// the Call 911 link must be on screen, big enough to tap, and the page must not scroll sideways.
const SCREENS = [
  { path: "/bystander", callTestId: "bystander-911" },
  { path: "/this-page-does-not-exist", callTestId: "fallback-911" },
]

async function expectUsable(page: Page, path: string, callTestId: string, label: string) {
  await page.goto(path)
  const call = page.getByTestId(callTestId)
  await expect(call, `${label}: Call 911 on ${path}`).toBeInViewport()
  const box = await call.boundingBox()
  expect(box?.height ?? 0, `${label}: Call 911 tap height on ${path}`).toBeGreaterThanOrEqual(44)
  expect(box?.width ?? 0, `${label}: Call 911 tap width on ${path}`).toBeGreaterThanOrEqual(44)
  const width = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }))
  expect(width.page, `${label}: ${path} should not scroll sideways`).toBeLessThanOrEqual(width.viewport + 1)
}

test("emergency screens stay usable on a 320px-wide phone (#301)", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  for (const screen of SCREENS) await expectUsable(page, screen.path, screen.callTestId, "320px")
})

test("emergency screens stay usable with text at 200% (#301)", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 })
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style")
      style.textContent = "html { font-size: 200% !important; }"
      document.head.append(style)
    })
  })
  for (const screen of SCREENS) await expectUsable(page, screen.path, screen.callTestId, "200% text")
})
