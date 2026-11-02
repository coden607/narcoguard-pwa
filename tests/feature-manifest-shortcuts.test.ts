import assert from "node:assert/strict"
import { test } from "node:test"
import manifest from "../app/manifest"

test("the installed icon offers Emergency, Find naloxone and Calm shortcuts", () => {
  const shortcuts = manifest().shortcuts ?? []
  assert.deepEqual(shortcuts.map((shortcut) => shortcut.short_name), ["Emergency", "Find naloxone", "Calm"])
  assert.deepEqual(shortcuts.map((shortcut) => shortcut.url), ["/ar", "/help", "/calm"])
})

test("shortcut URLs carry no query string, so offline cache lookups still match", () => {
  for (const shortcut of manifest().shortcuts ?? []) {
    assert.doesNotMatch(shortcut.url, /[?#]/)
    assert.ok(shortcut.icons?.every((icon) => icon.src.startsWith("/icon-192.png")))
  }
})
