import { strict as assert } from "node:assert"
import { test } from "node:test"
import { routeAngelTurn } from "../lib/angel-routing"

test("short conversational turns use the smallest token budget", () => {
  assert.deepEqual(routeAngelTurn("Thanks"), { task: "quick", maxTokens: 420, temperature: 0.2, useTools: false })
})

test("resource requests enable tools without a large completion budget", () => {
  const route = routeAngelTurn("Find a food pantry near me")
  assert.equal(route.task, "resource")
  assert.equal(route.useTools, true)
  assert.ok(route.maxTokens < 800)
})

test("planning requests get a larger but bounded reasoning budget", () => {
  const route = routeAngelTurn("Help me plan tomorrow around work and meals")
  assert.equal(route.task, "reasoning")
  assert.ok(route.maxTokens <= 900)
})
