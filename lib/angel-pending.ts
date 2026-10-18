/** One unsent chat turn, held in component memory only. Never a background queue. */
export interface AngelPendingTurn {
  id: string
  content: string
  body: string
  status: "pending" | "sending"
}

export function beginAngelAttempt(turn: AngelPendingTurn, online: boolean): AngelPendingTurn | null {
  return online && turn.status === "pending" ? { ...turn, status: "sending" } : null
}

export function finishAngelAttempt(turn: AngelPendingTurn | null, id: string, success: boolean): AngelPendingTurn | null {
  if (!turn || turn.id !== id) return turn
  return success ? null : { ...turn, status: "pending" }
}
