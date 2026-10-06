import { strict as assert } from "node:assert"
import { test } from "node:test"
import { parseAngelLocalCommand } from "../lib/angel-voice-commands"

test("voice navigation commands stay local", () => {
  assert.deepEqual(parseAngelLocalCommand("Open my needs planner"), { type: "navigate", href: "/stability" })
  assert.deepEqual(parseAngelLocalCommand("show training"), { type: "navigate", href: "/ar" })
})

test("voice UI commands stay local", () => {
  assert.deepEqual(parseAngelLocalCommand("clear conversation"), { type: "clear" })
  assert.deepEqual(parseAngelLocalCommand("turn on read aloud"), { type: "read_aloud", enabled: true })
})

test("normal questions still go to Angel", () => {
  assert.equal(parseAngelLocalCommand("Help me figure out what to eat before work"), null)
})
