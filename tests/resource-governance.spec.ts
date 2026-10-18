import { expect, test } from "@playwright/test"

test("private review shows pending hours accurately and never claims provider hours changed", async ({ page }) => {
  let submitted: Record<string, unknown> | undefined
  await page.route("**/api/resources/**", async route => {
    const request = route.request()
    if (request.method() === "POST") {
      submitted = request.postDataJSON()
      return route.fulfill({ status: 201, json: { id: "report-123", status: "open" } })
    }
    return route.fulfill({ json: request.url().includes("reports") ? { reports: [] } : { items: [], reviewer: false } })
  })
  await page.goto("/resources/review")
  await page.getByLabel("Source-scoped resource reference").fill("provider:123")
  await page.getByLabel("Report type").selectOption("hours")
  await page.getByLabel("Observed local time").fill("2026-10-16T09:30")
  await page.getByLabel("What hours did you observe?").fill("Closed at 9:30 despite posted opening")
  await page.getByLabel("Details or proposed correction").fill("Door sign said closed")
  await page.getByRole("button", { name: "Submit for review" }).click()
  await expect(page.locator("#main-content").getByRole("status")).toContainText("Submitted for review")
  expect(submitted?.reportType).toBe("hours")
  expect(submitted?.observedTimezone).toBeTruthy()
  await expect(page.getByText("Reports do not replace provider hours automatically.")).toBeVisible()
})

test("unavailable review retains the draft and reports no success", async ({ page }) => {
  await page.route("**/api/resources/**", route => route.fulfill({ status: 503, json: { error: "Resource review is unavailable until database setup is complete." } }))
  await page.goto("/resources/review")
  await page.getByLabel("Source-scoped resource reference").fill("provider:123")
  await page.getByLabel("Details or proposed correction").fill("Please correct hours")
  await page.getByRole("button", { name: "Submit for review" }).click()
  await expect(page.locator("#main-content").getByRole("status")).toContainText("unavailable")
  await expect(page.getByLabel("Details or proposed correction")).toHaveValue("Please correct hours")
})
