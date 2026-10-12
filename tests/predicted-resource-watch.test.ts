import { strict as assert } from "node:assert"
import { test } from "node:test"
import { heroWatchKindsForNeeds, unwatchablePredictedNeeds } from "../lib/predicted-resource-watch"

test("predicted needs map only to truthful supported Hero watch categories", () => {
  assert.deepEqual(heroWatchKindsForNeeds(["food", "water", "hygiene", "safePlace"]), [
    "food", "water", "shower", "hygiene", "shelter-help",
  ])
})

test("unsupported predicted needs stay in-app instead of being silently relabeled", () => {
  assert.deepEqual(unwatchablePredictedNeeds(["sleep", "laundry", "connection", "treatment"]), [
    "sleep", "laundry", "connection", "treatment",
  ])
  assert.deepEqual(heroWatchKindsForNeeds(["sleep", "laundry", "connection", "treatment"]), [])
})
