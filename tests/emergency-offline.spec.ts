import { expect, test } from "@playwright/test"

// Airplane-mode check of the emergency path (issue #264). After the service worker has installed
// once, home must still open Emergency options with a working tel:911 link and the overdose steps
// while the browser has no network at all.
test("emergency options work offline after the app has been opened once", async ({ page, context }) => {
  await page.addInitScript(() => {
    localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true, skippedSetup: true }))
  })
  await page.goto("/")
  await page.evaluate(async () => {
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Service worker registration timeout")), 10_000))
    await Promise.race([navigator.serviceWorker.ready, timeout])
  })
  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith("/sw.js"))
  const emergency = page.getByRole("button", { name: /EMERGENCY OPTIONS/ })
  await expect(emergency).toBeVisible()

  await context.setOffline(true)
  try {
    await page.reload()
    await expect(emergency).toBeVisible()
    await expect(page.getByRole("link", { name: "Call 911" }).first()).toHaveAttribute("href", "tel:911")
    await emergency.click()
    const modal = page.getByTestId("emergency-modal")
    await expect(modal).toBeVisible()
    await expect(modal.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911")
    await expect(modal.getByRole("heading", { name: "If someone may be overdosing" })).toBeVisible()
    await expect(modal.getByText(/Give naloxone/)).toBeVisible()
  } finally {
    await context.setOffline(false)
  }
})
