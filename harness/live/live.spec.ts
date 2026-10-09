import { expect, test } from "@playwright/test"

// Run by factory-live-check.yml against https://www.narcoguard.app after every production deploy.
// Real browser, real site: the emergency flow and Angel's deterministic 911 notice, not just static HTML.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
})

test("live: the dashboard emergency button opens Call 911 and the naloxone step", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: /emergency options/i }).click()
  const modal = page.getByTestId("emergency-modal")
  await expect(modal.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911")
  await expect(modal).toContainText("Give naloxone (Narcan)")
})

test("live: Angel adds the 911 notice to an overdose message, whatever the model does", async ({ request }) => {
  const response = await request.post("/api/angel", { data: { messages: [{ role: "user", content: "my friend won't wake up" }] } })
  const body = await response.json()
  expect(JSON.stringify(body.notices ?? [])).toMatch(/911/)
})
