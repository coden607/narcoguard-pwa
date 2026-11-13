import { expect, test } from "@playwright/test"

test("Life Compass remains local until explicitly encrypted and can recover after reload", async ({ page }) => {
  await page.goto("/angel/life-compass")
  const vault = page.getByTestId("life-compass-vault")
  await expect(vault).toBeVisible()
  const key = "narcoguard_life_compass_vault_v1"
  expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull()

  await vault.getByRole("button", { name: /Encrypted decision journal/ }).click()
  await vault.getByLabel("Decision or situation").fill("Should I apply for a new job this month?")
  await vault.getByLabel("Small next action (you choose)").fill("Write one application")
  await vault.getByLabel("Possible result (your hypothesis, not a prediction from AI)").fill("I might submit two applications")
  await vault.getByLabel("What observation would test it?").fill("Count applications actually submitted")
  await vault.getByLabel("Vault passphrase (12 characters minimum)").fill("local private passphrase for test only")
  await vault.getByRole("button", { name: "Encrypt and save entry" }).click()
  await expect(vault.getByRole("status")).toContainText("encrypted and saved")
  const stored = await page.evaluate(k => localStorage.getItem(k), key)
  expect(stored).toContain("AES-256-GCM")
  expect(stored).not.toContain("Should I apply for a new job")
  expect(stored).not.toContain("local private passphrase")

  await page.reload()
  const restored = page.getByTestId("life-compass-vault")
  await restored.getByRole("button", { name: /Encrypted decision journal/ }).click()
  await restored.getByLabel("Vault passphrase (12 characters minimum)").fill("local private passphrase for test only")
  await restored.getByRole("button", { name: "Unlock saved history" }).click()
  await expect(restored.getByRole("status")).toContainText("1 decision(s) unlocked")
  await expect(restored).toContainText("I might submit two applications")
  await restored.getByLabel("Date of observed result").fill("2026-12-01")
  await restored.getByLabel("What actually happened?").fill("Submitted one application")
  await restored.getByLabel("Vault passphrase (12 characters minimum)").fill("local private passphrase for test only")
  await restored.getByRole("button", { name: "Encrypt and record outcome" }).click()
  await expect(restored.getByRole("status")).toContainText("Observed outcome encrypted and saved")
  await expect(restored).toContainText("Submitted one application")
})

test("Life Compass research sends only independently typed generic terms, never a journal", async ({ page }) => {
  await page.goto("/angel/life-compass")
  const evidence = page.getByTestId("life-compass-evidence")
  let queryUrl = ""
  await page.route("**/api/angel/literature?*", async route => {
    queryUrl = route.request().url()
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ source: "NCBI PubMed", articles: [{ pmid: "123456",
        title: "A sample systematic review", journal: "Research Journal", published: "2024",
        url: "https://pubmed.ncbi.nlm.nih.gov/123456/", doi: null,
        provenance: "NCBI PubMed metadata", studyQuality: "not-assessed" }],
        evidenceLimit: "Metadata only" }),
    })
  })
  await evidence.getByLabel("Research terms").fill("CBT psychological flexibility")
  await evidence.getByRole("button", { name: "Search PubMed" }).click()
  await expect(evidence.getByRole("link", { name: "A sample systematic review" })).toHaveAttribute("href", "https://pubmed.ncbi.nlm.nih.gov/123456/")
  expect(queryUrl).toContain("CBT%20psychological%20flexibility")
  expect(queryUrl).not.toContain("ledger")
})
