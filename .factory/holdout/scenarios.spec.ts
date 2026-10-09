import { expect, test } from "@playwright/test"

// HOLDOUT. Hidden from the building agent (FACTORY_RULES.md 9). Each scenario is a bug that once
// reached production past a green suite, or an invariant whose quiet breakage would hurt most.

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
})

test("camera stays allowed for the pulse check (Permissions-Policy camera=(self))", async ({ request }) => {
  const response = await request.get("/")
  expect(response.headers()["permissions-policy"] ?? "").toContain("camera=(self)")
})

test("every crisis number is exact", async ({ page }) => {
  await page.goto("/safer-use")
  for (const tel of ["tel:911", "tel:988", "tel:211", "tel:18006624357", "tel:18004843731"]) {
    await expect(page.locator(`a[href="${tel}"]`).first(), tel).toBeAttached()
  }
  await page.goto("/")
  await page.getByRole("button", { name: /emergency options/i }).click()
  await expect(page.getByTestId("emergency-modal").locator('a[href^="tel:9"]').first()).toHaveAttribute("href", "tel:911")
})

test("shelter search finds charities by name and never lists animal shelters", async ({ request }) => {
  const body = await (await request.get("/api/resources/needs?zip=00002")).json()
  const names = (kind: string) => (body.kinds?.[kind]?.results ?? []).map((r: { name: string }) => r.name).join(" | ")
  expect(names("shelter") + names("food")).toContain("Catholic Charities of Plainsville")
  expect(names("shelter")).not.toMatch(/Humane|Animal|Pet Rescue/i)
})

test("water lists potable taps and never a fountain marked not drinkable", async ({ request }) => {
  const body = await (await request.get("/api/resources/needs?zip=00002")).json()
  const water = (body.kinds?.water?.results ?? []).map((r: { name: string }) => r.name)
  expect(water).toContain("Town Water Tap")
  expect(water).not.toContain("Decorative Fountain")
})

test("Angel answers a needs question quickly", async ({ page }) => {
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  const started = Date.now()
  await page.getByLabel("Message Angel").fill("I'm hungry, my zip is 13901")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByLabel("Conversation with Angel")).toContainText("Broome Community Food Pantry", { timeout: 15_000 })
  expect(Date.now() - started).toBeLessThan(8_000)
})

test("a ZIP said to Angel is remembered on the phone and reused by Find help", async ({ page }) => {
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  await page.getByLabel("Message Angel").fill("I'm hungry, my zip is 13901")
  await page.getByRole("button", { name: "Send message" }).click()
  await expect(page.getByLabel("Conversation with Angel")).toContainText("Broome Community Food Pantry", { timeout: 15_000 })
  await page.goto("/help")
  await expect(page.getByLabel("ZIP code", { exact: true })).toHaveValue("13901")
})

test("a shared location is rounded before it leaves the phone and before it is saved", async ({ browser }) => {
  const context = await browser.newContext({ geolocation: { latitude: 42.123456, longitude: -75.987654 }, permissions: ["geolocation"] })
  const page = await context.newPage()
  await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
  const sent: string[] = []
  page.on("request", (req) => { if (req.url().includes("/api/resources/")) sent.push(req.url()) })
  await page.goto("/help")
  await page.getByRole("button", { name: "Find everything near me" }).click()
  await expect.poll(() => sent.length, { timeout: 15_000 }).toBeGreaterThan(0)
  for (const url of sent) {
    const params = new URL(url).searchParams
    for (const key of ["lat", "lon"]) {
      const value = params.get(key)
      if (value) expect(value.split(".")[1]?.length ?? 0, `${key}=${value}`).toBeLessThanOrEqual(3)
    }
    expect(url).not.toContain("123456")
  }
  const saved = await page.evaluate(() => localStorage.getItem("narcoguard_saved_place_v1") ?? "")
  expect(saved).not.toContain("123456")
  await context.close()
})

test("a ZIP with no directory answer still offers 211", async ({ page }) => {
  await page.goto("/help")
  await page.getByLabel("ZIP code", { exact: true }).fill("00009")
  await page.getByRole("button", { name: "Search", exact: true }).click()
  await expect(page.locator('a[href="tel:211"]').first()).toBeVisible({ timeout: 20_000 })
})
