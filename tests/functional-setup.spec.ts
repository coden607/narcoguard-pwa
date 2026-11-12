import { expect, test } from "@playwright/test"

const saved = {
  name: "Test Person", hasCompletedOnboarding: true, skippedSetup: true,
  emergencyContacts: [{ id: "friend", name: "Test Friend", relationship: "Friend", phone: "6075550100", notifyMethod: "call" }],
  naloxoneLocations: [{ id: "kit", description: "Naloxone kit", location: "Entry shelf", instructions: "Top drawer" }],
  legal: { state: "New York", acknowledgedGoodSamaritan: true, acceptedTerms: true, acceptedPrivacy: true, acceptedHIPAA: true },
}

test("editing setup preserves existing details and finishing clears the skipped flag", async ({ page }) => {
  await page.addInitScript((preferences) => {
    if (!localStorage.getItem("narcoguard_preferences")) localStorage.setItem("narcoguard_preferences", JSON.stringify(preferences))
  }, saved)
  await page.goto("/")
  await page.getByRole("button", { name: "Settings", exact: true }).click()
  await expect(page.getByTestId("onboarding")).toBeVisible()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page.getByLabel("Your Name", { exact: true })).toHaveValue("Test Person")
  await page.getByRole("button", { name: "Continue", exact: true }).click()
  await expect(page.getByPlaceholder("Contact name")).toHaveValue("Test Friend")
  // Steps 3 through 11 use the existing saved acknowledgements.
  for (let step = 3; step <= 11; step++) await page.getByRole("button", { name: "Continue", exact: true }).click()
  await page.getByRole("button", { name: /^(?:Skip Install & )?Launch Dashboard$/ }).click()
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible()
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("narcoguard_preferences")!))
  expect(stored.skippedSetup).toBe(false)
  expect(stored.emergencyContacts[0].name).toBe("Test Friend")
  expect(stored.naloxoneLocations[0].location).toBe("Entry shelf")
  await page.goto("/contacts")
  await expect(page.getByRole("link", { name: "Call Test Friend", exact: true })).toHaveAttribute("href", "tel:6075550100")
  await expect(page.getByText("Entry shelf", { exact: true })).toBeVisible()
})

test("denied storage allows visiting the dashboard without getting trapped in setup", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Storage blocked", "SecurityError") } })
  })
  await page.goto("/")
  await page.getByRole("button", { name: "Skip Setup (Demo Mode)", exact: true }).click()
  await page.getByRole("button", { name: "Continue to Demo Mode", exact: true }).click()
  await expect(page.getByRole("button", { name: "Settings", exact: true })).toBeVisible()
  await expect(page.getByText(/Your browser could not save settings/)).toBeVisible()
  await page.goto("/daily-life")
  await page.getByRole("button", { name: "Enable Daily Life", exact: true }).click()
  await expect(page.getByRole("heading", { name: "What I want available", exact: true })).toBeVisible()
  await expect(page.getByText(/Your browser could not save Daily Life/)).toBeVisible()
  await page.getByRole("button", { name: "Enable support tools", exact: true }).click()
  await expect(page.getByText(/Your browser could not save support-tool changes/)).toBeVisible()
  await page.goto("/help")
  await expect(page.getByRole("heading", { name: "Find help", exact: true })).toBeVisible()
  await expect(page.getByLabel("ZIP code", { exact: true })).toBeEnabled()
})
