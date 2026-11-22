import { expect, test } from "@playwright/test"

// Dark by default, a remembered light/dark choice with no flash, and a 3D showcase that falls back
// to the static concept render. Emergency screens never carry the 3D effects.

const ONBOARDED = JSON.stringify({ hasCompletedOnboarding: true })

test.describe("theme and holographic showcase", () => {
  test("dark is the default even when the system prefers light", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" })
    await page.goto("/watch")
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/)
    await expect(page.getByTestId("theme-toggle")).toBeVisible()
  })

  test("the toggle switches theme, persists across reloads, and never flashes the wrong theme", async ({ page }) => {
    await page.goto("/watch")
    await page.getByTestId("theme-toggle").click()
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/)
    expect(await page.evaluate(() => localStorage.getItem("ng-theme"))).toBe("light")

    // Record the theme as soon as <body> exists, before any React code runs.
    await page.addInitScript(() => {
      document.addEventListener("readystatechange", () => {
        if (document.readyState === "interactive") (window as unknown as { __firstTheme: string }).__firstTheme = document.documentElement.classList.contains("dark") ? "dark" : "light"
      }, { once: true })
    })
    await page.reload()
    expect(await page.evaluate(() => (window as unknown as { __firstTheme: string }).__firstTheme)).toBe("light")
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/)

    await page.getByTestId("theme-toggle").click()
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/)
    await page.reload()
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/)
  })

  test("reduced motion keeps the static concept render instead of loading 3D", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/watch")
    const showcase = page.getByTestId("holo-showcase")
    await expect(showcase).toHaveAttribute("data-showcase-mode", "image")
    const render = showcase.locator('img[src*="ng-rev5-hero-titanium"]')
    await expect(render).toBeVisible()
    await expect.poll(() => render.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    await expect(showcase).toContainText("Concept render")
  })

  test("without WebGL the showcase falls back to the concept render", async ({ page }) => {
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === "webgl" || type === "webgl2" || type === "experimental-webgl") return null
        return (original as (...a: unknown[]) => unknown).call(this, type, ...rest)
      } as typeof original
    })
    await page.goto("/fund")
    const showcase = page.getByTestId("holo-showcase")
    await expect(showcase).toHaveAttribute("data-showcase-mode", "image")
    await expect(showcase.locator('img[src*="ng-rev5-hero-titanium"]')).toBeVisible()
  })

  test("home dashboard shows the showcase below Call 911 and funds the NG2Pro campaign", async ({ page }) => {
    await page.addInitScript((prefs) => localStorage.setItem("narcoguard_preferences", prefs), ONBOARDED)
    await page.goto("/")
    await expect(page.getByTestId("holo-showcase")).toBeVisible()
    await expect(page.locator('a[href="https://www.gofundme.com/f/save-lives-with-narcoguard-ng2pro-watches"]').first()).toBeAttached()
  })

  for (const theme of ["dark", "light"] as const) {
    test(`emergency screens stay free of 3D effects in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem("ng-theme", t), theme)
      await page.goto("/bystander")
      await expect(page.getByTestId("bystander-911")).toBeInViewport()
      await expect(page.getByTestId("holo-showcase")).toHaveCount(0)
      await expect(page.locator("canvas")).toHaveCount(0)
    })
  }
})
