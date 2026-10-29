import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { AngelUndo } from "../components/ai/angel-undo"
import { droppedIds, markUndone, MAX_RECENT_ACTIONS, recordAction, UNDO_NOTES, type AngelAction } from "../lib/angel-undo"

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

test("clearing the chat and forgetting the place are undoable; restore data never leaves page memory", () => {
  const chat = readFileSync("components/ai/angel-ai.tsx", "utf8")
  assert.match(chat, /recordUndoable\("clear-conversation"/)
  assert.match(chat, /recordUndoable\("forget-place"/)
  assert.match(chat, /<AngelUndo actions=\{actions\} onUndo=\{undoAction\} onDismiss=\{dismissActions\} \/>/)
  // Restoring a location writes it back only when the person still has "remember" on.
  assert.match(chat, /if \(readRememberChoice\(window\.localStorage\)\) savePlace\(window\.localStorage, forgottenLocation\)/)
  // Dismissing drops every restore closure.
  assert.match(chat, /const dismissActions = \(\) => \{\s*restoreRef\.current\.clear\(\)/)
  const lib = readFileSync("lib/angel-undo.ts", "utf8")
  assert.doesNotMatch(lib, /localStorage|fetch\(|sessionStorage/)
})
