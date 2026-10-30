import { expect, test } from "@playwright/test"

// NOTE: every function passed to addInitScript/evaluate runs in the browser
// with no closure — module-level constants are NOT captured. Inline the keys.

const stubDirectories = (page: import("@playwright/test").Page, results: unknown[]) => {
  const searched: string[] = []
  void page.route("**/api/resources/understand*", (route) => route.fulfill({ json: { available: false, provider: null } }))
  void page.route("**/api/resources/needs?*", async (route) => {
    searched.push(new URL(route.request().url()).searchParams.get("zip") ?? "")
    await route.fulfill({
      json: {
        status: "ok",
        fetchedAt: new Date().toISOString(),
        kinds: {
          food: { status: "ok", results, fallback: [] },
        },
      },
    })
  })
  return searched
}

test("travel mode ranks a destination ZIP, then returns home on turn off", async ({ page }) => {
  const searched = stubDirectories(page, [
    { kind: "food", name: "Example pantry", address: "1 Main St", distanceMiles: 2, source: "Test directory" },
  ])
  await page.addInitScript(() => {
    window.localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ zip: "13901" }))
  })
  await page.goto("/help")
  await expect(page.getByTestId("travel-banner")).toHaveCount(0)
  // The Forget button renders exactly when the saved-place restore effect has run.
  await expect(page.getByTestId("forget-saved-place")).toBeVisible()
  await page.getByLabel("ZIP code").fill("10001")
  await page.getByRole("button", { name: "Use this ZIP for travel (24h)" }).click()
  await expect(page.getByTestId("travel-banner")).toContainText("Travel mode: searching ZIP 10001")
  await expect.poll(() => searched.at(-1)).toBe("10001")
  // Results render inside the per-kind panel, which opens once the need is stated.
  await page.getByRole("button", { name: "Food", exact: true }).click()
  await expect(page.getByText("Example pantry")).toBeVisible()
  await page.getByRole("button", { name: "Turn off" }).click()
  await expect(page.getByTestId("travel-banner")).toHaveCount(0)
  await page.getByRole("button", { name: "Search" }).click()
  await expect.poll(() => searched.at(-1)).toBe("13901")
})

test("travel keeps empty and unavailable states explicit with a 211 fallback", async ({ page }) => {
  const searched = stubDirectories(page, [])
  await page.addInitScript(() => {
    window.localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ zip: "13901" }))
    const now = Date.now()
    window.localStorage.setItem(
      "narcoguard_travel_mode_v1",
      JSON.stringify({
        version: 1,
        active: true,
        destinationZip: "10001",
        homeZip: "13901",
        startedAt: new Date(now - 1 * 3600000).toISOString(),
        expiresAt: new Date(now + 20 * 3600000).toISOString(),
      }),
    )
  })
  await page.goto("/help")
  await expect(page.getByTestId("travel-banner")).toContainText("Travel mode: searching ZIP 10001")
  // Empty-state copy lives inside the per-kind panel, which opens once the user states that need.
  await page.getByRole("button", { name: "Food", exact: true }).click()
  await expect(page.getByText("No listings found nearby in public data. That does not mean there are none; try the directories below.")).toBeVisible()
  await expect(page.getByTestId("call-211-food")).toBeVisible()
  expect(searched.at(-1)).toBe("10001")
})

test("travel survives an expired window by falling back to home without a stale banner", async ({ page }) => {
  const searched = stubDirectories(page, [])
  await page.addInitScript(() => {
    window.localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ zip: "13901" }))
    const now = Date.now()
    window.localStorage.setItem(
      "narcoguard_travel_mode_v1",
      JSON.stringify({
        version: 1,
        active: true,
        destinationZip: "10001",
        homeZip: "13901",
        startedAt: new Date(now - 4 * 3600000).toISOString(),
        expiresAt: new Date(now - 2 * 3600000).toISOString(),
      }),
    )
  })
  await page.goto("/help")
  await expect(page.getByTestId("travel-banner")).toHaveCount(0)
  await page.getByRole("button", { name: "Search" }).click()
  await expect.poll(() => searched.at(-1)).toBe("13901")
})

test("a deleted travel record is gone after reload and searches use home", async ({ page }) => {
  const searched = stubDirectories(page, [])
  // Seed only the saved place here; seeding travel via initScript would
  // re-create it on every reload, undoing the removal this test performs.
  await page.addInitScript(() => {
    window.localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ zip: "13901" }))
  })
  await page.goto("/help")
  await page.evaluate(() => {
    const now = Date.now()
    window.localStorage.setItem(
      "narcoguard_travel_mode_v1",
      JSON.stringify({
        version: 1,
        active: true,
        destinationZip: "10001",
        homeZip: "13901",
        startedAt: new Date(now - 1 * 3600000).toISOString(),
        expiresAt: new Date(now + 20 * 3600000).toISOString(),
      }),
    )
  })
  await page.reload()
  await expect(page.getByTestId("travel-banner")).toBeVisible()
  await page.evaluate(() => window.localStorage.removeItem("narcoguard_travel_mode_v1"))
  await page.reload()
  await expect(page.getByTestId("travel-banner")).toHaveCount(0)
  await page.getByRole("button", { name: "Search" }).click()
  await expect.poll(() => searched.at(-1)).toBe("13901")
})

test("blocked storage says travel could not be saved instead of crashing", async ({ page }) => {
  // Stub directories so the restore lookup finishes and the finder leaves busy state.
  stubDirectories(page, [])
  // Seed the saved place first; installing the throwing setItem override in an
  // init script would also break the seed write on the real navigation.
  await page.addInitScript(() => {
    window.localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ zip: "13901" }))
  })
  await page.goto("/help")
  await expect(page.getByTestId("forget-saved-place")).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, "setItem", {
      configurable: true,
      value: () => {
        throw new Error("storage denied")
      },
    })
  })
  await page.getByLabel("ZIP code").fill("10001")
  await page.getByRole("button", { name: "Use this ZIP for travel (24h)" }).click()
  await expect(page.getByRole("status").filter({ hasText: "could not be saved" })).toBeVisible()
  await expect(page.getByTestId("travel-banner")).toHaveCount(0)
  await expect(page.getByTestId("needs-finder").getByRole("link", { name: "911" })).toHaveAttribute("href", "tel:911")
})

test("offline travel lookup says the directory is unreachable and keeps 911 one tap away", async ({ page, context }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ zip: "13901" }))
    const now = Date.now()
    window.localStorage.setItem(
      "narcoguard_travel_mode_v1",
      JSON.stringify({
        version: 1,
        active: true,
        destinationZip: "10001",
        homeZip: "13901",
        startedAt: new Date(now - 1 * 3600000).toISOString(),
        expiresAt: new Date(now + 20 * 3600000).toISOString(),
      }),
    )
  })
  await page.goto("/help")
  // Offline after load: localhost must stay reachable for the initial navigation.
  await context.setOffline(true)
  await page.getByRole("button", { name: "Search" }).click()
  await expect(page.getByText("Could not reach the directories. Check your connection.")).toBeVisible()
  await expect(page.getByTestId("call-211-unavailable")).toBeVisible()
  await expect(page.getByTestId("travel-banner")).toContainText("Travel mode: searching ZIP 10001")
})

test("travel banner stays on screen at 280px with enlarged text", async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ zip: "13901" }))
    const now = Date.now()
    window.localStorage.setItem(
      "narcoguard_travel_mode_v1",
      JSON.stringify({
        version: 1,
        active: true,
        destinationZip: "10001",
        homeZip: "13901",
        startedAt: new Date(now - 1 * 3600000).toISOString(),
        expiresAt: new Date(now + 20 * 3600000).toISOString(),
      }),
    )
  })
  await page.setViewportSize({ width: 280, height: 720 })
  await page.goto("/help")
  const banner = page.getByTestId("travel-banner")
  await expect(banner).toContainText("Travel mode: searching ZIP 10001")
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" })
  const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
  expect(width.page).toBeLessThanOrEqual(width.viewport + 1)
  await banner.scrollIntoViewIfNeeded()
  await expect(banner).toBeInViewport()
  await page.getByRole("button", { name: "Turn off" }).scrollIntoViewIfNeeded()
  await expect(page.getByRole("button", { name: "Turn off" })).toBeInViewport()
})
