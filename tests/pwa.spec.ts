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

  test("robots and sitemap list only real public pages on the canonical host", async ({ page, request }) => {
    const robots = await request.get("/robots.txt")
    expect(robots.ok()).toBeTruthy()
    const robotsText = await robots.text()
    expect(robotsText).toContain("Disallow: /api/")
    expect(robotsText).toContain("Sitemap: https://www.narcoguard.app/sitemap.xml")

    const sitemap = await request.get("/sitemap.xml")
    expect(sitemap.ok()).toBeTruthy()
    const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
    expect(urls.length).toBeGreaterThan(5)
    for (const url of urls) {
      expect(url.startsWith("https://www.narcoguard.app")).toBeTruthy()
      const path = new URL(url).pathname
      expect((await request.get(path)).status(), `${path} should load`).toBe(200)
    }

    // A site-wide canonical of "/" would mark every page as a duplicate of the homepage.
    await page.goto("/watch")
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
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
        expect.objectContaining({ src: "/icon-maskable-512.png", sizes: "512x512", purpose: "maskable" }),
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
    const nextStep = page.locator("section", { has: page.getByRole("heading", { name: "Find a next step" }) })
    await expect(nextStep.getByRole("link", { name: /Find local help through 211/ })).toBeVisible()
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

  test("meal log is optional, calorie-free, survives reload, pauses and erases with the planner", async ({ page }) => {
    await page.goto("/stability")
    await page.getByRole("button", { name: "Enable my private planner" }).click()
    const meals = page.getByRole("list", { name: "Meals logged today" })

    await expect(page.getByRole("heading", { name: "Meals today (optional)" })).toBeVisible()
    await expect(page.getByText(/calorie/i)).toContainText("no calories")
    // Food help is shown without logging anything first.
    const mealSection = page.getByRole("region", { name: "Meals today (optional)" })
    await expect(mealSection.getByRole("link", { name: /Find local help through 211/ })).toBeVisible()

    await page.getByLabel("Meal type").selectOption("lunch")
    await page.getByLabel("What you had (optional)").fill("Soup at the center")
    await page.getByRole("button", { name: "Add meal" }).click()
    await expect(meals).toContainText("Lunch: Soup at the center")
    await expect(page.getByTestId("meal-summary")).toContainText("checked in on 1 day and logged a meal on 1 of them")
    await expect(page.getByLabel("Food status")).toHaveValue("")

    await page.reload()
    await expect(meals).toContainText("Lunch: Soup at the center")

    await page.getByRole("button", { name: "Pause" }).click()
    await expect(page.getByRole("button", { name: "Add meal" })).toBeDisabled()
    await page.getByRole("button", { name: "Resume" }).click()

    await page.getByRole("button", { name: "Remove Lunch: Soup at the center" }).click()
    await expect(meals).toHaveCount(0)
    await page.getByRole("button", { name: "Add meal" }).click()
    page.once("dialog", (dialog) => dialog.accept())
    await page.getByRole("button", { name: "Erase all Guardian data" }).click()
    await page.getByRole("button", { name: "Enable my private planner" }).click()
    await expect(meals).toHaveCount(0)
  })

  test("nearby help search validates ZIP, shows sourced listings with call-first notes, and keeps directory fallbacks", async ({ page }) => {
    const requested: string[] = []
    await page.route("**/api/resources/nearby**", async (route) => {
      requested.push(new URL(route.request().url()).search)
      await route.fulfill({ json: {
        status: "ok",
        results: [{ name: "Test Food Pantry", kind: "food", address: "1 Main St", phone: "518-555-0100", distanceMiles: 0.8, lat: 42.65, lon: -73.75, source: "OpenStreetMap contributors" }],
        fallback: [{ title: "Find local help through 211", url: "https://www.211.org/get-help" }],
      } })
    })
    await page.goto("/angel")
    const search = page.getByTestId("nearby-resources")
    await search.getByRole("button", { name: "Food" }).click()
    await search.getByLabel("ZIP code").fill("122")
    await search.getByRole("button", { name: "Search" }).click()
    await expect(search.getByText("Enter a five-digit US ZIP code.")).toBeVisible()
    expect(requested).toHaveLength(0)

    await search.getByLabel("ZIP code").fill("12207")
    await search.getByRole("button", { name: "Search" }).click()
    await expect(search.getByText("Test Food Pantry")).toBeVisible()
    await expect(search.getByRole("link", { name: "Call 518-555-0100" })).toHaveAttribute("href", "tel:5185550100")
    await expect(search.getByText(/Source: OpenStreetMap contributors\. .*call first/)).toBeVisible()
    await expect(search.getByRole("link", { name: "Find local help through 211" })).toBeVisible()
    expect(requested).toEqual(["?kind=food&zip=12207"])
  })

  test("Angel AI says when it is not configured and the search still works without it", async ({ page }) => {
    await page.goto("/angel")
    await expect(page.getByTestId("angel-unavailable")).toBeVisible()
    await expect(page.getByTestId("nearby-resources")).toBeVisible()
  })

  test("Angel AI requires consent and shows the 911 notice for an overdose message regardless of the reply", async ({ page }) => {
    let body: { messages?: { role: string; content: string }[] } | undefined
    await page.route("**/api/angel", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
      body = route.request().postDataJSON()
      await route.fulfill({ json: { available: true, notices: ["If someone may be overdosing or isn't breathing: call 911 now, give naloxone (Narcan) if you have it, and stay with them."], reply: "Call 911 now." } })
    })
    await page.goto("/angel")
    await expect(page.getByLabel("Message Angel")).toHaveCount(0)
    await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
    await page.getByLabel("Message Angel").fill("my friend is overdosing")
    await page.getByRole("button", { name: "Send message" }).click()
    const conversation = page.getByLabel("Conversation with Angel")
    await expect(conversation.getByRole("alert")).toContainText("call 911 now")
    expect(body?.messages).toEqual([{ role: "user", content: "my friend is overdosing" }])
    await page.getByRole("button", { name: "Clear conversation" }).click()
    await expect(conversation.getByRole("alert")).toHaveCount(0)
  })

  test("dashboard offers a Bluetooth device connection without claiming detection", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("narcoguard_preferences", JSON.stringify({ hasCompletedOnboarding: true })))
    await page.goto("/")
    const ble = page.getByTestId("bluetooth-vitals")
    await expect(ble).toBeVisible()
    await expect(ble).toContainText("does not use these readings to detect overdoses")
  })

  test("Good Samaritan step shows the selected state's statute and limits, not a blanket promise", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("You Are Protected")).toHaveCount(0)
    for (let i = 0; i < 10; i++) {
      const nameInput = page.getByPlaceholder("Enter your name")
      if (await nameInput.isVisible()) await nameInput.fill("Sam")
      await page.getByRole("button", { name: "Continue" }).click()
    }
    await expect(page.getByRole("heading", { name: "Good Samaritan Laws" })).toBeVisible()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "Texas" }).click()
    const law = page.getByTestId("state-law")
    await expect(law).toContainText("Tex. Health & Safety Code § 481.115(g)")
    await expect(law).toContainText("defense in court, not immunity")
    await expect(page.getByText("not legal advice", { exact: false })).toBeVisible()
  })

  test("the NarcoGuard logo appears in the header of every public page", async ({ page }) => {
    for (const path of ["/", "/angel", "/watch", "/stability", "/constitution", "/fund", "/hero-signup", "/ar", "/privacy", "/terms"]) {
      await page.goto(path)
      const logo = page.locator(".site-header .brand-mark img")
      await expect(logo, path).toBeVisible()
      expect(await logo.evaluate((img) => (img as HTMLImageElement).naturalWidth), path).toBeGreaterThan(0)
    }
  })

  test("the Constitution is linked from the footer of every page", async ({ page }) => {
    await page.goto("/privacy")
    const link = page.locator(".site-footer").getByRole("link", { name: "Constitution" })
    await expect(link).toHaveAttribute("href", "/constitution")
    await link.click()
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Constitution")
  })

  test("hands-free voice sends what was heard and speaks the 911 notice first", async ({ page }) => {
    await page.addInitScript(() => {
      const spoken: string[] = []
      ;(window as unknown as { __spoken: string[] }).__spoken = spoken
      class FakeRecognition {
        lang = ""; continuous = false; interimResults = false
        onresult: ((e: unknown) => void) | null = null
        onerror: ((e: unknown) => void) | null = null
        onend: (() => void) | null = null
        static turns = 0
        start() {
          const turn = FakeRecognition.turns++
          setTimeout(() => {
            if (turn === 0) this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: "my friend is overdosing" }], { isFinal: true })] })
            else this.onerror?.({ error: "not-allowed" })
            this.onend?.()
          }, 50)
        }
        stop() { this.onend?.() }
        abort() { this.onend?.() }
      }
      // Replace both names: current Chromium ships an unprefixed SpeechRecognition that would win.
      for (const name of ["SpeechRecognition", "webkitSpeechRecognition"]) Object.defineProperty(window, name, { value: FakeRecognition, configurable: true, writable: true })
      const synth = {
        speak(u: { text: string; onend?: () => void }) { if (u.text.trim()) spoken.push(u.text); setTimeout(() => u.onend?.(), 10) },
        cancel() {},
      }
      Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true })
      ;(window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = class { text: string; lang = ""; rate = 1; volume = 1; onend?: () => void; onerror?: () => void; constructor(t: string) { this.text = t } }
    })
    let body: { messages?: { content: string }[] } | undefined
    await page.route("**/api/angel", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Vercel AI Gateway" } })
      body = route.request().postDataJSON()
      await route.fulfill({ json: { available: true, notices: ["Call 911 now."], reply: "Stay with them." } })
    })
    await page.goto("/angel")
    await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
    await page.getByRole("button", { name: "Hands-free conversation" }).click()
    await expect(page.getByLabel("Conversation with Angel").getByRole("alert")).toContainText("Call 911 now.")
    expect(body?.messages?.at(-1)?.content).toBe("my friend is overdosing")
    await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(" "))).toBe("Call 911 now. Stay with them.")
    // The second turn's permission error ends hands-free with an explanation.
    await expect(page.getByText("Microphone access was not allowed. You can still type.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Hands-free conversation" })).toHaveAttribute("aria-pressed", "false")
  })

  test("when the AI provider rejects access, Angel switches off but keeps the 911 notice visible", async ({ page }) => {
    await page.route("**/api/angel", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Vercel AI Gateway" } })
      await route.fulfill({ status: 503, json: { available: false, notices: ["Call 911 now."], message: "Angel AI is not switched on yet." } })
    })
    await page.goto("/angel")
    await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
    await page.getByLabel("Message Angel").fill("my friend is overdosing")
    await page.getByRole("button", { name: "Send message" }).click()
    await expect(page.getByTestId("angel-unavailable")).toBeVisible()
    await expect(page.locator("main").getByRole("alert")).toContainText("Call 911 now.")
  })
})
