import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const read = (path: string) => readFileSync(path, "utf8")

test("every error screen renders the emergency fallback", () => {
  for (const file of ["app/error.tsx", "app/global-error.tsx", "app/not-found.tsx"]) {
    assert.match(read(file), /<EmergencyFallback /, file)
  }
  assert.match(read("app/error.tsx"), /^"use client"/)
  assert.match(read("app/global-error.tsx"), /^"use client"/)
  assert.match(read("app/global-error.tsx"), /<html lang="en"/)
})

test("the fallback keeps Call 911 and the shared overdose steps", () => {
  const fallback = read("components/common/emergency-fallback.tsx")
  assert.match(fallback, /href="tel:911"/)
  assert.match(fallback, /from "@\/components\/emergency\/overdose-steps"/)
  assert.match(fallback, /OVERDOSE_STEPS\.map/)
  assert.doesNotMatch(fallback, /useState|useEffect|fetch\(/)
})
