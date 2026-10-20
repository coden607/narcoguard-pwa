import { expect, test } from "@playwright/test"

test("enlarged text and iPhone display zoom keep public actions reachable", async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 720 })
  for (const path of ["/auth", "/account", "/watch", "/help", "/stability", "/angel", "/health-records"]) {
    await page.goto(path)
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" })
    const width = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }))
    expect(width.page, path).toBeLessThanOrEqual(width.viewport + 1)
    await expect(page.getByRole("button", { name: "Toggle navigation" })).toBeInViewport()
    await page.getByRole("button", { name: "Toggle navigation" }).click()
    await expect(page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Account", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Toggle navigation" }).click()
  }
})

test("update prompt keeps a draft when reload is cancelled and explains offline state", async ({ page, context }) => {
  let version = "build-one"
  await page.route("**/api/app-version", route => route.fulfill({ json: { version } }))
  await page.goto("/auth")
  await expect(page.getByTestId("app-build-status")).toContainText("Build build-one")
  await page.getByLabel("Email", { exact: true }).fill("draft@example.com")
  version = "build-two"
  await page.getByRole("button", { name: "Check for updates" }).click()
  await expect(page.getByTestId("pwa-update-notice")).toContainText("build-two")
  page.once("dialog", dialog => dialog.dismiss())
  await page.getByRole("button", { name: "Update now" }).click()
  await expect(page.getByLabel("Email", { exact: true })).toHaveValue("draft@example.com")
  await context.setOffline(true)
  await expect(page.getByTestId("app-connectivity-status")).toContainText("Offline")
  await context.setOffline(false)
  await expect(page.getByTestId("app-connectivity-status")).toContainText("Online")
})

test("update cancellation also protects crisis-plan drafts outside forms", async ({ page }) => {
  let version = "build-one"
  await page.route("**/api/app-version", route => route.fulfill({ json: { version } }))
  await page.goto("/planning")
  await page.getByRole("button", { name: "Enable local planning" }).click()
  await page.getByLabel("First steps").fill("An unsaved private plan")
  version = "build-two"
  await page.getByRole("button", { name: "Check for updates" }).click()
  await expect(page.getByTestId("pwa-update-notice")).toBeVisible()
  page.once("dialog", dialog => dialog.dismiss())
  await page.getByRole("button", { name: "Update now" }).click()
  await expect(page.getByLabel("First steps")).toHaveValue("An unsaved private plan")
})

test.describe("touch scrolling", () => {
  test.use({ hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1" })
  test("a short-screen install dialog scrolls with a finger and closes by keyboard", async ({ page, context, browserName }) => {
    await page.setViewportSize({ width: 280, height: 360 })
    await page.goto("/auth")
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" })
    await page.getByRole("button", { name: "Install", exact: true }).first().click()
    const dialog = page.getByTestId("install-guide")
    await expect(dialog).toBeVisible()
    const box = (await dialog.boundingBox())!
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.y + box.height).toBeLessThanOrEqual(361)
    const before = await dialog.evaluate(el => el.scrollTop)
    if (browserName === "chromium") {
      const session = await context.newCDPSession(page)
      const x = box.x + box.width / 2, y = box.y + box.height - 35
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] })
      for (let step = 1; step <= 5; step++) await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - step * 25 }] })
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
      await session.detach()
    } else {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.wheel(0, 150)
    }
    await expect.poll(() => dialog.evaluate(el => el.scrollTop)).toBeGreaterThan(before)
    await page.keyboard.press("Escape")
    await expect(dialog).toBeHidden()
  })
})


test("UHS health records and Angel remain usable at narrow iPhone display zoom", async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 720 })
  for (const path of ["/health-records", "/angel"]) {
    await page.goto(path)
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" })
    const dimensions = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }))
    expect(dimensions.page, path).toBeLessThanOrEqual(dimensions.viewport + 1)
  }

  await page.goto("/health-records")
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" })
  await expect(page.getByTestId("uhs-mychart-connector")).toBeVisible()
  const uhsLink = page.getByRole("link", { name: /Open UHS MyChart/ })
  await uhsLink.scrollIntoViewIfNeeded()
  await expect(uhsLink).toBeInViewport()
})
