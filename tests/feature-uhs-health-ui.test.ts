import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"

test("UHS health UI never auto-loads records and provides disconnect", async () => {
  const source = await readFile(new URL("../components/health/uhs-mychart-controls.tsx", import.meta.url), "utf8")
  assert.match(source, /Load my UHS summary/)
  assert.match(source, /fetch\("\/api\/health\/uhs\/summary"/)
  assert.match(source, /onClick=\{\(\) => void load\(\)\}/)
  assert.doesNotMatch(source, /useEffect/)
  assert.match(source, /\/api\/health\/uhs\/disconnect/)
  assert.match(source, /does not save this summary to local storage or its database/)
})
