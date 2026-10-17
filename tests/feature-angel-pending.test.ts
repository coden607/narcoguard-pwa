import { strict as assert } from "node:assert"
import { test } from "node:test"
import { beginAngelAttempt, finishAngelAttempt, type AngelPendingTurn } from "../lib/angel-pending"

const turn: AngelPendingTurn = { id: "one", content: "Find food", body: "{}", status: "pending" }

test("offline turns stay pending and retries cannot overlap", () => {
  assert.equal(beginAngelAttempt(turn, false), null)
  const sending = beginAngelAttempt(turn, true)!
  assert.equal(sending.status, "sending")
  assert.equal(beginAngelAttempt(sending, true), null)
  assert.equal(sending.id, turn.id)
})

test("only a matching successful response clears a turn; failure permits manual retry", () => {
  const sending = beginAngelAttempt(turn, true)!
  const failed = finishAngelAttempt(sending, "one", false)!
  assert.equal(failed.status, "pending")
  assert.equal(beginAngelAttempt(failed, true)?.id, "one")
  assert.equal(finishAngelAttempt(sending, "one", true), null)
  assert.equal(finishAngelAttempt(null, "one", true), null)
  assert.equal(finishAngelAttempt(turn, "old-response", true), turn)
})
