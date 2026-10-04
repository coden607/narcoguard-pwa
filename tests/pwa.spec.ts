import { expect, test } from "@playwright/test"

test.describe("PWA production flow", () => {
  test("primary navigation links resolve to existing pages", async ({ page, request }) => {
    await page.goto("/privacy")

    const hrefs = await page.locator('nav[aria-label="Primary navigation"] a').evaluateAll((links) =>
      links.map((link) => link.getAttribute("href")),
    )
    expect(hrefs.length).toBeGreaterThan(0)

    for (const href of hrefs) {
      const response = await request.get(href!)
      expect(response.status(), `${href} should not 404`).toBe(200)
    }
  })

  test("emergency and outline buttons keep their own readable backgrounds", async ({ page }) => {
    await page.goto("/ar")

    const cpr = page.getByRole("button", { name: "Start CPR Guide" })
    await expect(cpr).toBeVisible()
    const cprStyle = await cpr.evaluate((element) => {
      const style = getComputedStyle(element)
      return { image: style.backgroundImage, color: style.backgroundColor }
    })
    expect(cprStyle.image, "emergency button must not be covered by the default gradient").toBe("none")
    expect(cprStyle.color).not.toBe("rgba(0, 0, 0, 0)")

    await page.goto("/hero-signup")
    const outline = page.getByRole("button", { name: "Preview Training Modules" })
    await expect(outline).toBeVisible()
    expect(await outline.evaluate((element) => getComputedStyle(element).backgroundImage)).toBe("none")
  })

  test("dashboard states that no live vitals exist and stops polling an unconfigured provider", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
    let vitalsRequests = 0
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/vitals") vitalsRequests++
    })

    await page.goto("/")
    const unavailable = page.getByTestId("vitals-unavailable")
    await expect(unavailable).toBeVisible()
    await expect(unavailable).toContainText("No live vitals")
    await expect(unavailable).toContainText("call 911")
    await expect(page.getByText("Initializing sensors")).toHaveCount(0)

    await page.waitForTimeout(5000)
    expect(vitalsRequests).toBe(1)
  })

  test("decorative motion stops when the person asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/fund")
    const pulse = page.getByText("Overdose prevention deserves careful, evidence-led innovation").locator("..")
    await expect(pulse).toBeVisible()

    const samples: string[] = []
    for (let i = 0; i < 4; i++) {
      samples.push(await pulse.evaluate((element) => getComputedStyle(element).transform))
      await page.waitForTimeout(300)
    }
    expect(new Set(samples).size, `transform changed over time: ${samples.join(" | ")}`).toBe(1)
  })

  test("skipping and resuming setup follows saved preferences across reloads", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Skip Setup (Demo Mode)" }).click()
    await page.getByRole("button", { name: "Continue to Demo Mode" }).click()
    await expect(page.getByText("Demo Mode Active")).toBeVisible()

    await page.reload()
    await expect(page.getByText("Demo Mode Active")).toBeVisible()

    await page.getByRole("button", { name: "Complete Setup" }).click()
    await expect(page.getByRole("button", { name: "Skip Setup (Demo Mode)" })).toBeVisible()
  })

  test("each opening of the emergency demo starts fresh", async ({ page }) => {
    // This checks state, not animation: reduced motion makes the dialog close immediately.
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
    await page.goto("/")
    const trigger = page.getByRole("button", { name: /emergency options/i })

    await trigger.click()
    await page.getByRole("button", { name: "Run Emergency Demo" }).click()
    await expect(page.getByText("Starting the demonstration...")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toHaveCount(0)

    await trigger.click()
    await expect(page.getByRole("button", { name: "Run Emergency Demo" })).toBeVisible()
    await expect(page.getByText("Starting the demonstration...")).toHaveCount(0)
  })

  test("mobile navigation closes after navigating", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/privacy")
    const toggle = page.getByRole("button", { name: "Toggle navigation" })
    await toggle.click()
    await expect(toggle).toHaveAttribute("aria-expanded", "true")

    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Training" }).click()
    await expect(page).toHaveURL(/\/ar$/)
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
  })

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
        expect.objectContaining({ src: "/icon-192.png", sizes: "192x192" }),
        expect.objectContaining({ src: "/icon-512.png", sizes: "512x512" }),
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

    expect(registration.scope).toBe("http://localhost:3000/")
    expect(registration.scriptURL).toBe("http://localhost:3000/sw.js")
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
    await expect(page.getByRole("link", { name: /Find local help through 211/ })).toBeVisible()
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
