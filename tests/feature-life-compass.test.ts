import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { angelRequestSchema, buildChatMessages, CRISIS_NOTICE, EMERGENCY_NOTICE, safetyNotices } from "../lib/angel-ai"
import { LIFE_COMPASS_SYSTEM_PROMPT, routeLifeCompassTurn } from "../lib/life-compass"
import { routeAngelTurn } from "../lib/angel-routing"

const message = { role: "user" as const, content: "Help me decide whether to take a new job" }

test("Life Compass requires an explicit validated request mode", () => {
  assert.equal(angelRequestSchema.safeParse({ messages: [message], mode: "life-compass" }).success, true)
  assert.equal(angelRequestSchema.safeParse({ messages: [message], mode: "clinical-therapy" }).success, false)
  const ordinary = buildChatMessages({ messages: [message] })
  const decision = buildChatMessages({ messages: [message], mode: "life-compass" })
  assert.equal(ordinary.length, 2)
  assert.equal(decision.length, 3)
  assert.equal(decision[0].content, ordinary[0].content)
  assert.equal(decision[1].role, "system")
  assert.equal(decision[1].content, LIFE_COMPASS_SYSTEM_PROMPT)
  assert.equal(decision.at(-1)?.content, message.content)
})

test("Decision prompts are explicitly evidence-aware without unsupported prediction claims", () => {
  assert.match(LIFE_COMPASS_SYSTEM_PROMPT, /independently verified facts/)
  assert.match(LIFE_COMPASS_SYSTEM_PROMPT, /plausible alternative explanations/)
  assert.match(LIFE_COMPASS_SYSTEM_PROMPT, /Never manufacture numerical probabilities/)
  assert.match(LIFE_COMPASS_SYSTEM_PROMPT, /24 hours, 30 days, 90 days and one year/)
  assert.match(LIFE_COMPASS_SYSTEM_PROMPT, /No live academic-search tool/)
  assert.match(LIFE_COMPASS_SYSTEM_PROMPT, /not a replacement for a psychologist/)
})

test("Decision mode uses reasoning but preserves the dedicated resource route", () => {
  const ordinary = routeAngelTurn("What are my options and what might happen in 90 days?")
  const decision = routeLifeCompassTurn(ordinary)
  assert.equal(decision.task, "reasoning")
  assert.equal(decision.maxTokens, 1400)
  assert.equal(decision.useTools, false)
  const resource = routeAngelTurn("Find food near me")
  assert.equal(routeLifeCompassTurn(resource), resource)
})

test("Safety notices remain deterministic and independent of mode", () => {
  assert.deepEqual(safetyNotices("someone is unresponsive after an overdose"), [EMERGENCY_NOTICE])
  assert.deepEqual(safetyNotices("I want to die"), [CRISIS_NOTICE])
})

test("Angel exposes a distinct Life Compass page with explicit sharing boundaries", () => {
  const page = readFileSync("app/angel/life-compass/page.tsx", "utf8")
  const component = readFileSync("components/ai/angel-ai.tsx", "utf8")
  assert.match(page, /AngelAI mode="life-compass"/)
  assert.match(component, /data-testid="life-compass-disclosure"/)
  assert.match(component, /\.\.\.\(isCompass \? \{ mode: "life-compass" \} : \{\}\)/)
  assert.match(component, /Use my local planning context for this chat/)
})
