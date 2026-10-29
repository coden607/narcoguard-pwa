import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { AngelUndo } from "../components/ai/angel-undo"
import { droppedIds, markUndone, mergeRestored, MAX_RECENT_ACTIONS, recordAction, UNDO_NOTES, type AngelAction } from "../lib/angel-undo"

test("recent actions keep the newest first, cap the list, and report what fell off", () => {
  let list: AngelAction[] = []
  for (let index = 0; index < MAX_RECENT_ACTIONS + 2; index++) list = recordAction(list, { id: `a${index}`, kind: index % 2 ? "forget-place" : "clear-conversation" })
  assert.equal(list.length, MAX_RECENT_ACTIONS)
  assert.equal(list[0].id, `a${MAX_RECENT_ACTIONS + 1}`)
  assert.ok(list.every((entry) => entry.status === "done"))
  const before = recordAction([], { id: "old", kind: "forget-place" })
  let after = before
  for (let index = 0; index < MAX_RECENT_ACTIONS; index++) after = recordAction(after, { id: `n${index}`, kind: "clear-conversation" })
  assert.deepEqual(droppedIds(before, after), ["old"])
})

test("an action can be undone once; unknown or repeated undo changes nothing", () => {
  const list = recordAction(recordAction([], { id: "one", kind: "clear-conversation" }), { id: "two", kind: "forget-place" })
  const undone = markUndone(list, "one")
  assert.equal(undone.find((entry) => entry.id === "one")?.status, "undone")
  assert.equal(undone.find((entry) => entry.id === "two")?.status, "done")
  assert.equal(markUndone(undone, "one"), undone)
  assert.equal(markUndone(undone, "missing"), undone)
})

test("undo notes say what comes back and what cannot, and labels carry no personal data", () => {
  assert.match(UNDO_NOTES["forget-place"], /offline map tiles were deleted and are not restored/)
  assert.match(UNDO_NOTES["clear-conversation"], /never saved anywhere/)
})

test("the Undo notice is a polite status with touch-sized, keyboard-reachable buttons and a recent list", () => {
  const actions = recordAction(recordAction([], { id: "one", kind: "clear-conversation" }), { id: "two", kind: "forget-place" })
  const html = renderToStaticMarkup(React.createElement(AngelUndo, { actions, onUndo: () => {}, onDismiss: () => {} }))
  assert.match(html, /role="status" aria-live="polite"/)
  assert.match(html, /Search area forgotten\./)
  assert.match(html, /<button[^>]*min-h-11[^>]*>.*Undo/)
  assert.match(html, /Dismiss/)
  assert.match(html, /Recent actions \(2\)/)
  assert.match(html, /sr-only">: Conversation cleared/)
  assert.doesNotMatch(html, /animate-/)
  assert.match(html, /flex-wrap/)
  const undone = renderToStaticMarkup(React.createElement(AngelUndo, { actions: markUndone(actions, "two"), onUndo: () => {}, onDismiss: () => {} }))
  assert.match(undone, /Search area forgotten — undone/)
  assert.equal(renderToStaticMarkup(React.createElement(AngelUndo, { actions: [], onUndo: () => {}, onDismiss: () => {} })), "")
})

test("undoing clears in any order keeps the conversation in its original order", () => {
  const a = [{ id: "a1" }, { id: "a2" }]
  const b = [{ id: "b1" }]
  const later = [{ id: "c1" }]
  const batchOf = new Map<string, number>()
  // Clear A (batch 0), clear B (batch 1), write C, then undo A before B.
  for (const m of a) batchOf.set(m.id, 0)
  let chat = mergeRestored(later, a, batchOf)
  assert.deepEqual(chat.map((m) => m.id), ["a1", "a2", "c1"])
  for (const m of b) batchOf.set(m.id, 1)
  chat = mergeRestored(chat, b, batchOf)
  assert.deepEqual(chat.map((m) => m.id), ["a1", "a2", "b1", "c1"])
  // Undoing B first, then A, gives the same order.
  const other = new Map<string, number>([["b1", 1]])
  let chat2 = mergeRestored(later, b, other)
  for (const m of a) other.set(m.id, 0)
  chat2 = mergeRestored(chat2, a, other)
  assert.deepEqual(chat2.map((m) => m.id), ["a1", "a2", "b1", "c1"])
})

test("clearing the chat and forgetting the place are undoable; restore data never leaves page memory", () => {
  const chat = readFileSync("components/ai/angel-ai.tsx", "utf8")
  assert.match(chat, /recordUndoable\("clear-conversation"/)
  assert.match(chat, /recordUndoable\("forget-place"/)
  assert.match(chat, /<AngelUndo actions=\{actions\} onUndo=\{undoAction\} onDismiss=\{dismissActions\} \/>/)
  // Restoring a location writes it back only when the person still has "remember" on.
  assert.match(chat, /if \(forgottenLocation && readRememberChoice\(window\.localStorage\)\) savePlace\(window\.localStorage, forgottenLocation\)/)
  // Undo restores both the ZIP and the location, and drops a pending request built for a different area.
  const forget = chat.slice(chat.indexOf("const forgetLocation"), chat.indexOf("const toggleRemember"))
  assert.match(forget, /recordUndoable\("forget-place", \(\) => \{\s*\/\/[^\n]*\n\s*locationGenerationRef\.current\+\+\s*\n\s*invalidatePendingContext\(\)/)
  assert.match(forget, /setLocation\(forgottenLocation\)/)
  assert.match(forget, /\n\s*setZip\(forgottenZip\)\n/)
  assert.match(chat, /mergeRestored\(messagesRef\.current, cleared, clearBatchRef\.current\.of\)/)
  // Dismissing drops every restore closure.
  assert.match(chat, /const dismissActions = \(\) => \{\s*restoreRef\.current\.clear\(\)/)
  const lib = readFileSync("lib/angel-undo.ts", "utf8")
  assert.doesNotMatch(lib, /localStorage|fetch\(|sessionStorage/)
})
