import { strict as assert } from "node:assert"
import { test } from "node:test"
import { angelRequestSchema, buildChatMessages } from "../lib/angel-ai"

test("Angel accepts bounded opt-in planning context", () => {
  const parsed=angelRequestSchema.parse({
    messages:[{role:"user",content:"Help me plan today"}],
    localContext:{topGoal:"keep my job",constraints:["no car"],upcoming:["2026-10-07 09:00: Work"]},
  })
  const messages=buildChatMessages(parsed)
  assert.ok(messages.some((message)=>message.role==="system" && message.content.includes("keep my job")))
})

test("Angel rejects unknown context fields", () => {
  assert.equal(angelRequestSchema.safeParse({messages:[{role:"user",content:"hi"}],localContext:{journal:"secret"}}).success,false)
})
