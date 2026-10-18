import { test, expect } from "@playwright/test"

test("a delayed geolocation result cannot restore a globally forgotten place", async ({ page, context }) => {
  const requests: Record<string, unknown>[] = []
  await page.addInitScript(() => {
    localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ zip: "13901" }))
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition: (success: PositionCallback) => {
        ;(window as unknown as { deliverAngelLocation: () => void }).deliverAngelLocation = () => success({ coords: { latitude: 42.1, longitude: -76.2 } } as GeolocationPosition)
      } },
    })
  })
  await page.route("**/api/angel", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
    requests.push(route.request().postDataJSON())
    return route.fulfill({ json: { reply: "We can plan without your location." } })
  })
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  await page.getByRole("button", { name: "Use my location", exact: true }).click()
  await expect(page.getByRole("button", { name: "Finding your location…", exact: true })).toBeVisible()
  await context.setOffline(true)
  const composer = page.getByRole("textbox", { name: "Message Angel", exact: true })
  await composer.fill("Plan tomorrow")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await composer.fill("Keep this new draft")
  await page.getByTestId("forget-saved-place").click()
  await expect(page.getByTestId("angel-pending")).toHaveCount(0)
  await page.evaluate(() => (window as unknown as { deliverAngelLocation: () => void }).deliverAngelLocation())
  await expect(page.getByTestId("angel-location-on")).toHaveCount(0)
  await expect(composer).toHaveValue("Plan tomorrow\n\nKeep this new draft")
  expect(await page.evaluate(() => localStorage.getItem("narcoguard_saved_place_v1"))).toBeNull()
  await context.setOffline(false)
  expect(requests).toHaveLength(0)
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByTestId("angel-chat-history")).toContainText("We can plan without your location.")
  expect(requests).toHaveLength(1)
  expect(requests[0]).not.toHaveProperty("location")
  expect(requests[0]).not.toHaveProperty("zip")
})

test("Angel keeps an oversized combined draft intact until the person shortens it", async ({ page, context }) => {
  let requests = 0
  await page.route("**/api/angel", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
    requests++
    return route.fulfill({ json: { reply: "Your edited draft reached Angel." } })
  })
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  const planning = page.getByRole("checkbox", { name: /Use my local planning context/ })
  await planning.check()
  await context.setOffline(true)
  const composer = page.getByRole("textbox", { name: "Message Angel", exact: true })
  const firstDraft = "a".repeat(2000)
  await composer.fill(firstDraft)
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByTestId("angel-pending")).toBeVisible()
  await composer.fill("Keep this newer draft too")
  await planning.uncheck()
  const combined = `${firstDraft}\n\nKeep this newer draft too`
  await expect(composer).toHaveValue(combined)
  await context.setOffline(false)
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.locator("#main-content").getByRole("alert")).toContainText("over 2,000 characters")
  await expect(composer).toHaveValue(combined)
  await expect(page.getByTestId("angel-pending")).toHaveCount(0)
  expect(requests).toBe(0)
  await composer.focus()
  await composer.press("ControlOrMeta+A")
  await composer.press("Backspace")
  await composer.fill("A shorter draft I chose")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByTestId("angel-chat-history")).toContainText("Your edited draft reached Angel.")
  expect(requests).toBe(1)
})

test.describe("Angel transcript touch scrolling", () => {
  test.use({ hasTouch: true })

  test("a downward finger swipe scrolls back through a long reply and the composer remains usable", async ({ page, context, browserName }) => {
    let requests = 0
    const longReply = Array.from({ length: 80 }, (_, index) => `Planning step ${index + 1}: choose a small action that works for you.`).join("\n")
    await page.route("**/api/angel", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
      requests++
      return route.fulfill({ json: { reply: requests === 1 ? longReply : "Your follow-up reached Angel." } })
    })
    await page.goto("/angel")
    await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
    const composer = page.getByRole("textbox", { name: "Message Angel", exact: true })
    await composer.fill("Help me plan a few steps")
    await page.getByRole("button", { name: "Send message", exact: true }).click()
    const history = page.getByTestId("angel-chat-history")
    await expect(history).toContainText("Planning step 80")
    await history.scrollIntoViewIfNeeded()
    await history.evaluate((element) => { element.scrollTop = element.scrollHeight })
    const before = await history.evaluate((element) => element.scrollTop)
    expect(before).toBeGreaterThan(100)
    const box = await history.boundingBox()
    expect(box).not.toBeNull()
    const viewport = page.viewportSize()!
    const visibleTop = Math.max(box!.y, 0)
    const visibleBottom = Math.min(box!.y + box!.height, viewport.height)
    const x = box!.x + box!.width / 2
    const startY = visibleTop + (visibleBottom - visibleTop) * 0.25
    const endY = visibleTop + (visibleBottom - visibleTop) * 0.8
    if (browserName === "chromium") {
      const session = await context.newCDPSession(page)
      try {
        await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: startY }] })
        for (let step = 1; step <= 8; step++) {
          await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: startY + (endY - startY) * step / 8 }] })
          await page.waitForTimeout(16)
        }
        await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] })
      } finally {
        await session.detach()
      }
    } else {
      await page.mouse.move(x, startY)
      await page.mouse.wheel(0, -350)
    }
    await expect.poll(() => history.evaluate((element) => element.scrollTop)).toBeLessThan(before - 30)
    await composer.scrollIntoViewIfNeeded()
    await composer.focus()
    await expect(composer).toBeFocused()
    await composer.fill("Keep the next step small")
    await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeEnabled()
    await composer.press("Enter")
    await expect(history).toContainText("Your follow-up reached Angel.")
    expect(requests).toBe(2)
  })
})

for (const revoked of ["planning context", "location", "global location", "other-tab location"] as const) {
  test(`Angel discards a pending payload when ${revoked} sharing is revoked`, async ({ page, context }) => {
    const requests: Record<string, unknown>[] = []
    await page.addInitScript(() => {
      localStorage.setItem("narcoguard_life_support_v1", JSON.stringify({ topGoal: "private planning goal" }))
      localStorage.setItem("narcoguard_saved_place_v1", JSON.stringify({ lat: 42.1, lon: -76.2 }))
    })
    await page.route("**/api/angel", async (route) => {
      if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
      requests.push(route.request().postDataJSON())
      return route.fulfill({ json: { reply: "We can plan a next step." } })
    })
    await page.goto("/angel")
    await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
    const planning = page.getByRole("checkbox", { name: /Use my local planning context/ })
    await planning.check()
    await expect(page.getByTestId("angel-location-on")).toBeVisible()
    const otherTab = revoked === "other-tab location" ? await context.newPage() : null
    if (otherTab) await otherTab.goto("/about")
    await context.setOffline(true)
    const composer = page.getByRole("textbox", { name: "Message Angel", exact: true })
    await composer.fill("Help me plan tomorrow")
    await page.getByRole("button", { name: "Send message", exact: true }).click()
    await expect(page.getByTestId("angel-pending")).toBeVisible()
    await composer.fill("Also keep my new draft")
    if (revoked === "planning context") await planning.uncheck()
    else if (revoked === "global location") await page.getByTestId("forget-saved-place").click()
    else if (otherTab) {
      await otherTab.evaluate(() => localStorage.removeItem("narcoguard_saved_place_v1"))
      await otherTab.close()
    } else await page.getByTestId("angel-forget-place").click()
    await expect(page.getByTestId("angel-pending")).toHaveCount(0)
    if (revoked !== "planning context") await expect(page.getByTestId("angel-location-on")).toHaveCount(0)
    await expect(composer).toHaveValue("Help me plan tomorrow\n\nAlso keep my new draft")
    await context.setOffline(false)
    expect(requests).toHaveLength(0)
    await page.getByRole("button", { name: "Send message", exact: true }).click()
    await expect(page.getByTestId("angel-chat-history")).toContainText("We can plan a next step.")
    expect(requests).toHaveLength(1)
    expect(requests[0]).not.toHaveProperty(revoked === "planning context" ? "localContext" : "location")
  })
}

test("Angel shows an in-flight turn without claiming success, and clear discards it", async ({ page }) => {
  let release!: () => void
  const released = new Promise<void>((resolve) => { release = resolve })
  await page.route("**/api/angel", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
    await released
    await route.fulfill({ json: { reply: "A late reply" } }).catch(() => {})
  })
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  await page.getByRole("textbox", { name: "Message Angel", exact: true }).fill("Plan my day")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.getByTestId("angel-pending")).toContainText("Sending — waiting for Angel's response")
  await expect(page.getByRole("button", { name: "Retry message", exact: true })).toBeDisabled()
  await expect(page.getByTestId("angel-chat-history").getByText("Plan my day", { exact: true })).toHaveCount(0)
  await page.getByRole("button", { name: "Clear conversation", exact: true }).click()
  release()
  await expect(page.getByTestId("angel-pending")).toHaveCount(0)
  await expect(page.getByTestId("angel-chat-history")).not.toContainText("A late reply")
})

test("Angel retains an offline message and sends only on a manual retry", async ({ page, context }) => {
  const requests: { messages: { role: string; content: string }[] }[] = []
  await page.route("**/api/angel", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
    requests.push(route.request().postDataJSON())
    return route.fulfill({ json: { reply: "Let's plan your next step." } })
  })
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  await context.setOffline(true)
  await page.getByRole("textbox", { name: "Message Angel", exact: true }).fill("Help me plan tomorrow")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  const pending = page.getByTestId("angel-pending")
  await expect(pending).toContainText("Pending — no response confirmed")
  await expect(pending.getByRole("button", { name: "Retry message" })).toBeDisabled()
  expect(requests).toHaveLength(0)
  await context.setOffline(false)
  await expect(pending.getByRole("button", { name: "Retry message" })).toBeEnabled()
  expect(requests).toHaveLength(0)
  await pending.getByRole("button", { name: "Retry message" }).click()
  await expect(pending).toHaveCount(0)
  await expect(page.getByTestId("angel-chat-history").getByText("Help me plan tomorrow", { exact: true })).toHaveCount(1)
  expect(requests).toHaveLength(1)
  expect(requests[0].messages.filter((message) => message.role === "user")).toEqual([{ role: "user", content: "Help me plan tomorrow" }])
})

test("Angel keeps failed attempts pending and cancel or clear prevents a reconnect send", async ({ page, context }) => {
  let attempts = 0
  await page.route("**/api/angel", async (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { available: true, provider: "Groq" } })
    attempts++
    return route.fulfill({ status: 503, json: { error: "Please try later." } })
  })
  await page.goto("/angel")
  await page.getByRole("button", { name: "I understand, talk to Angel" }).click()
  await page.getByRole("textbox", { name: "Message Angel", exact: true }).fill("Find food")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  const pending = page.getByTestId("angel-pending")
  await expect(pending).toContainText("Pending — no response confirmed")
  expect(attempts).toBe(1)
  await pending.getByRole("button", { name: "Retry message" }).click()
  await expect(pending).toContainText("Pending — no response confirmed")
  expect(attempts).toBe(2)
  await expect(page.getByTestId("angel-chat-history").getByText("Find food", { exact: true })).toHaveCount(0)
  await pending.getByRole("button", { name: "Cancel pending message" }).click()
  await expect(pending).toHaveCount(0)
  await context.setOffline(true)
  await page.getByRole("textbox", { name: "Message Angel", exact: true }).fill("Find shelter")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(pending).toBeVisible()
  await page.getByRole("button", { name: "Clear conversation", exact: true }).click()
  await expect(pending).toHaveCount(0)
  await context.setOffline(false)
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toBeDisabled()
  expect(attempts).toBe(2)
})
