import { strict as assert } from "node:assert"
import { test } from "node:test"
import { routeAngelTurn } from "../lib/angel-routing"

test("pleasantries use the smallest budget and no search", () => {
  assert.deepEqual(routeAngelTurn("Thanks"), { task: "quick", maxTokens: 300, temperature: 0.6, useTools: false })
  assert.equal(routeAngelTurn("thank you so much!").useTools, false)
  assert.equal(routeAngelTurn("hey").useTools, false)
})

test("other short messages may imply a need, so the model may search", () => {
  const route = routeAngelTurn("I got kicked out tonight")
  assert.equal(route.useTools, true)
  assert.ok(route.temperature >= 0.5, "conversational replies are not robotic")
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
