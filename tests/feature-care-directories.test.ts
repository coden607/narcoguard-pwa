import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { TREATMENT_DIRECTORIES, TREATMENT_FACTS, TREATMENT_LINE } from "../lib/care-directories"

test("treatment links go to official SAMHSA and NIDA pages over https", () => {
  const urls = TREATMENT_DIRECTORIES.flatMap((group) => group.links.map((link) => link.url))
  assert.ok(urls.includes("https://findtreatment.gov"))
  for (const url of urls) assert.match(url, /^https:\/\/([a-z0-9-]+\.)*(samhsa\.gov|findtreatment\.gov|nida\.nih\.gov)(\/|$)/)
  assert.equal(new Set(urls).size, urls.length)
})

test("the helpline is the SAMHSA number and telehealth starts are mentioned", () => {
  assert.equal(TREATMENT_LINE.tel, "18006624357")
  assert.ok(TREATMENT_FACTS.some((fact) => /video or phone/i.test(fact)))
})

test("the treatment page sends nothing and shows sources", () => {
  const page = readFileSync("app/treatment/page.tsx", "utf8")
  assert.doesNotMatch(page, /fetch\(|localStorage/)
  assert.match(page, /SourceList/)
})
