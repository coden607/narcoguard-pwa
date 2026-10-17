import { expect, test } from "@playwright/test"

test.describe("PWA production flow", () => {
  test("serves a valid install manifest and icons", async ({ page, request }) => {
    await page.goto("/")

    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute("href")
    expect(manifestHref).toBe("/manifest.webmanifest")

    const response = await request.get(manifestHref!)
    expect(response.ok()).toBeTruthy()
    expect(response.headers()["content-type"]).toContain("application/manifest+json")

    const manifest = await response.json()
    expect(manifest.start_url).toBe("/")
    expect(manifest.display).toBe("standalone")
    expect(manifest.icons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ src: "/icon-192.png?v=9", sizes: "192x192" }),
        expect.objectContaining({ src: "/icon-512.png?v=9", sizes: "512x512" }),
      ]),
    )

    for (const icon of manifest.icons) {
      const iconResponse = await request.get(icon.src)
      expect(iconResponse.ok(), `${icon.src} should load`).toBeTruthy()
      expect(iconResponse.headers()["content-type"]).toContain("image/png")
    }
  })

  test("registers and activates the root service worker", async ({ page }) => {
    await page.goto("/")
    const registration = await page.evaluate(async () => {
      const timeoutPromise: Promise<never> = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service worker registration timeout")), 10000),
      )
      try {
        const ready = (await Promise.race([navigator.serviceWorker.ready, timeoutPromise])) as ServiceWorkerRegistration
        return { scope: ready.scope, scriptURL: ready.active?.scriptURL }
      } catch (error) {
        console.error("Service worker error:", error)
        const registrations = await navigator.serviceWorker.getRegistrations()
        console.error("Registrations found:", registrations.length)
        throw error
      }
    })

    expect(registration.scope).toMatch(/^https?:\/\/[^/]+\/$/)
    expect(registration.scriptURL).toMatch(/^https?:\/\/[^/]+\/sw\.js$/)
  })

  test("serves the offline fallback after installation", async ({ page, context }) => {
    await page.goto("/")
    await page.evaluate(async () => {
      const timeoutPromise: Promise<never> = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Service worker registration timeout")), 10000),
      )
      try {
        await Promise.race([navigator.serviceWorker.ready, timeoutPromise])
      } catch (error) {
        console.error("Service worker error:", error)
        const registrations = await navigator.serviceWorker.getRegistrations()
        console.error("Registrations found:", registrations.length)
        throw error
      }
    })
    await page.reload()
    // A ready registration can exist before this page is controlled by it.
    await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith("/sw.js"))
    expect(await page.evaluate(async () => Boolean(await caches.match("/offline.html")))).toBe(true)

    await context.setOffline(true)
    await page.goto("/offline-check")
    await expect(page.getByRole("heading", { name: "You're Offline" })).toBeVisible()
    await context.setOffline(false)
  })

  test("Guardian needs planner requires consent and can be paused and erased", async ({ page }) => {
    await page.goto("/stability")
    await expect(page.getByRole("heading", { name: "Guardian Stability" })).toBeVisible()
    await expect(page.getByLabel("Food status")).toHaveCount(0)

    await page.getByRole("button", { name: "Enable my private planner" }).click()
    await page.getByLabel("Food status").selectOption("needs-help")
    await page.getByLabel("Hours slept last night").fill("7")
    await expect(page.getByRole("link", { name: "Find local help through 211", exact: true }).first()).toBeVisible()
    await page.getByLabel("Task or appointment").fill("Visit pantry")
    await page.getByLabel("Plan time").fill("09:00")
    await page.getByLabel("Plan location").fill("Community pantry")
    await page.getByLabel("Plan need").selectOption("food")
    await page.getByRole("button", { name: "Add to plan" }).click()
    await expect(page.getByText(/Visit pantry/)).toBeVisible()
    await expect(page.getByText(/appointment at/)).toBeVisible()

    await page.getByRole("button", { name: "Pause" }).click()
    await expect(page.getByLabel("Food status")).toBeDisabled()
    await page.reload()
    await expect(page.getByLabel("Food status")).toBeDisabled()
    await page.getByRole("button", { name: "Resume" }).click()
    await expect(page.getByLabel("Food status")).toHaveValue("needs-help")

    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Erase all Guardian data" }).click()
    await expect(page.getByRole("button", { name: "Enable my private planner" })).toBeVisible()
  })
})

test('watch, account and support reflow on narrow zoomed displays', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 720 })
  for (const path of ['/auth', '/account', '/watch', '/fund']) {
    await page.goto(path)
    const width = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }))
    expect(width.page, `${path} should fit the viewport`).toBeLessThanOrEqual(width.viewport + 1)
    await expect(page.getByRole('button', { name: 'Toggle navigation' })).toBeInViewport()
  }
  const image = page.locator('img[src*="ng-titanium-3d"]').first()
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
})

test('the complete primary watch board retains its full aspect ratio on iPhone widths', async ({ page }) => {
  for (const width of [280, 390]) {
    await page.setViewportSize({ width, height: 844 })
    await page.goto('/watch')
    const board = page.getByTestId('rev5-primary-visuals').locator('img').first()
    await expect(board).toBeVisible()
    const dimensions = await board.evaluate((img: HTMLImageElement) => ({
      width: img.getBoundingClientRect().width,
      height: img.getBoundingClientRect().height,
      parentHeight: img.parentElement!.getBoundingClientRect().height,
    }))
    expect(dimensions.height / dimensions.width).toBeCloseTo(1024 / 1536, 2)
    expect(dimensions.parentHeight).toBeGreaterThanOrEqual(dimensions.height)
    await expect(page.getByRole('link', { name: 'Open full-size watch blueprint' })).toHaveAttribute('href', /rev=complete-2026-10-15/)
  }
})

test('watch viewer recovers from unavailable WebGL without hiding the complete watch', async ({ page }) => {
  // Exercise the real renderer's failure path rather than assuming a cloud browser has a GPU.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith('webgl') || type === 'experimental-webgl') return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.setViewportSize({ width: 280, height: 720 })
  await page.goto('/watch')
  await page.getByRole('tab', { name: '3D View', exact: true }).click()
  const viewer = page.getByTestId('watch-3d')
  await expect(viewer).toHaveAttribute('data-status', 'unsupported')
  const image = viewer.getByRole('img', { name: 'NG46 titanium and NG40 rose-titanium concept watch board' })
  await expect(image).toBeVisible()
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(1536)
  const box = await image.boundingBox()
  expect(box!.height / box!.width).toBeCloseTo(1024 / 1536, 2)
  await expect(viewer.getByRole('link', { name: 'Open full-size concept watch board' })).toHaveAttribute('href', /rev=complete-2026-10-15/)
  await expect(viewer.getByRole('slider', { name: 'Exploded view' })).toBeDisabled()
  await expect(viewer.getByRole('button', { name: 'Auto-rotate', exact: true })).toBeDisabled()
  await expect(viewer.getByRole('button', { name: 'Reset view', exact: true })).toBeDisabled()
  await viewer.getByRole('button', { name: 'Retry interactive 3D' }).click()
  await expect(viewer).toHaveAttribute('data-status', 'unsupported')
  await expect(image).toBeVisible()
  await expect(viewer.locator('canvas')).toHaveCount(0)
  await page.getByRole('button', { name: /NG40 Elegant/ }).click()
  await expect(viewer).toHaveAttribute('data-case-mm', '40')
  await expect(viewer).toHaveAttribute('data-status', 'unsupported')
  await expect(image).toBeVisible()
  const width = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }))
  expect(width.page).toBeLessThanOrEqual(width.viewport + 1)
})

test('watch retry cleans up a renderer that failed after attaching its canvas', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    let failed = false
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === '2d' && document.querySelector('[data-testid="watch-3d"] canvas') && !failed) {
        failed = true
        throw new Error('Simulated watch texture initialization failure')
      }
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
  })
  await page.goto('/watch')
  await page.getByRole('tab', { name: '3D View', exact: true }).click()
  const viewer = page.getByTestId('watch-3d')
  await expect(viewer).toHaveAttribute('data-status', 'unsupported')
  await expect(viewer.locator('canvas')).toHaveCount(0)
  await viewer.getByRole('button', { name: 'Retry interactive 3D' }).click()
  await expect(viewer).toHaveAttribute('data-status', 'ready')
  await expect(viewer.locator('canvas')).toHaveCount(1)
  await expect(viewer.getByRole('slider', { name: 'Exploded view' })).toBeEnabled()
})
