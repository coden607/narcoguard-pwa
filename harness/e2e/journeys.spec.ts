import { expect, test } from "@playwright/test"

// MISSION.md Gate 3: the three journeys a real person takes, against a production build whose only
// stubbed parts are the outside directories and the AI provider (harness/directory-stub.mjs).
// Nothing NarcoGuard serves is mocked here.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
})

test("emergency: Call 911 and the naloxone step are one tap from the dashboard", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: /emergency options/i }).click()
  const modal = page.getByTestId("emergency-modal")
  await expect(modal.getByRole("link", { name: "Call 911" })).toHaveAttribute("href", "tel:911")
  await expect(modal).toContainText("Give naloxone (Narcan)")
})

test("emergency: 911 and 988 links are exact on Find help and Angel, signed out and without location", async ({ page }) => {
  for (const path of ["/help", "/angel"]) {
    await page.goto(path)
    await expect(page.locator('a[href="tel:911"]').first()).toBeVisible()
    await expect(page.locator('a[href="tel:988"]').first()).toBeVisible()
  }
})

test("find help: food and water near ZIP 13901 come from the real search with sources", async ({ page }) => {
  await page.goto("/help")
  await page.getByRole("button", { name: "Food", exact: true }).click()
  await page.getByRole("button", { name: "Water", exact: true }).click()
  await page.getByLabel("ZIP code", { exact: true }).fill("13901")
  await page.getByRole("button", { name: "Search", exact: true }).click()
  const yours = page.getByTestId("your-needs")
  await expect(yours).toContainText("Broome Community Food Pantry", { timeout: 20_000 })
  await expect(yours).toContainText("Court Street Water Fountain")
  await expect(yours).toContainText("OpenStreetMap")
})

test("find help: food banks match by their tag whatever their name, and water marked not drinkable never shows", async ({ request }) => {
  const body = await (await request.get("/api/resources/needs?zip=13901")).json()
  const names = (kind: string) => (body.kinds?.[kind]?.results ?? []).map((r: { name: string }) => r.name)
  expect(names("food")).toContain("Southern Tier Helping Hands")
  expect(names("water")).toContain("Court Street Water Fountain")
  expect(names("water")).not.toContain("Broken Bubbler")
})

test("find help: a need with no listing offers Call 211", async ({ page }) => {
  await page.goto("/help")
  await page.getByLabel("ZIP code", { exact: true }).fill("13901")
  await page.getByRole("button", { name: "Search", exact: true }).click()
  await expect(page.getByTestId("call-211-showers")).toHaveAttribute("href", "tel:211", { timeout: 20_000 })
})

test("angel: a hungry person gets a nearby place with a phone number", async ({ page }) => {
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  await page.getByLabel("Message Angel").fill("I'm hungry, my zip is 13901")
  await page.getByRole("button", { name: "Send message" }).click()
  const conversation = page.getByLabel("Conversation with Angel")
  await expect(conversation).toContainText("Broome Community Food Pantry", { timeout: 30_000 })
  await expect(conversation).toContainText("607 555 0101")
})

test("angel: an overdose message gets the 911 notice", async ({ page }) => {
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  await page.getByLabel("Message Angel").fill("my friend won't wake up")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByLabel("Conversation with Angel").getByRole("alert")).toContainText(/call 911/i, { timeout: 30_000 })
})
