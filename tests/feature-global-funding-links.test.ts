import { strict as assert } from "node:assert"
import { test } from "node:test"
import { readFile } from "node:fs/promises"

test("global shell exposes prominent reciprocal NarcoGuard and GoFundMe links", async () => {
  const chrome = await readFile(new URL("../components/site-chrome.tsx", import.meta.url), "utf8")
  assert.match(chrome, /https:\/\/narcoguard\.app/)
  assert.match(chrome, /https:\/\/gofund\.me\/9acf270ea/)
  assert.match(chrome, /NARCOGUARD\.APP/)
  assert.match(chrome, /SUPPORT ON GOFUNDME/)
  assert.match(chrome, /text-2xl/)
})

test("campaign source keeps reciprocal links explicit", async () => {
  const campaign = await readFile(new URL("../marketing/GOFUNDME_CAMPAIGN.md", import.meta.url), "utf8")
  const config = JSON.parse(await readFile(new URL("../marketing/campaign-config.json", import.meta.url), "utf8"))
  assert.match(campaign, /LIVE APP: https:\/\/narcoguard\.app/)
  assert.match(campaign, /GOFUNDME: https:\/\/gofund\.me\/9acf270ea/)
  assert.equal(config.links.app, "https://narcoguard.app")
  assert.equal(config.links.gofundme, "https://gofund.me/9acf270ea")
})

test("agents are instructed to bootstrap pinned coden607 skills", async () => {
  const agents = await readFile(new URL("../AGENTS.md", import.meta.url), "utf8")
  assert.match(agents, /github\.com\/coden607\/skills\.git/)
  assert.match(agents, /setup:agent-skills/)
  assert.match(agents, /smallest relevant skill set/)
})
