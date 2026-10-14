import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("Angel uses a standard LLM transcript directly above the composer", () => {
  const source = readFileSync("components/ai/angel-ai.tsx", "utf8")

  const settings = source.indexOf("Use my local planning context for this chat.")
  const history = source.indexOf('data-testid="angel-chat-history"')
  const composer = source.indexOf('data-testid="angel-composer"')

  assert.ok(settings >= 0, "planning controls should remain available")
  assert.ok(history > settings, "settings and controls should be above the transcript")
  assert.ok(composer > history, "the composer should follow the transcript")
  assert.match(source, /aria-label="Conversation with Angel"/)
  assert.doesNotMatch(source.slice(history, composer), /Use my local planning context/)
  assert.match(source.slice(history, composer), /<div ref=\{endRef\} \/>[\s\S]*<\/div>[\s\S]*<form/)
  assert.match(source, /Message Angel…/)
  assert.match(source, /Enter to send · Shift\+Enter for a new line/)
  assert.match(source, /event\.key === "Enter" && !event\.shiftKey/)
})
