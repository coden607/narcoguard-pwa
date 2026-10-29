// Undo for the actions Angel takes on this phone (issue #245): clearing the conversation and forgetting
// where to search. The list lives in page memory only, holds at most a few entries, and never stores
// message text or a place in its labels; the restore data stays inside the component until undone.

export type AngelActionKind = "clear-conversation" | "forget-place"
export type AngelActionStatus = "done" | "undone"

export interface AngelAction {
  id: string
  kind: AngelActionKind
  status: AngelActionStatus
}

export const MAX_RECENT_ACTIONS = 5

export const ACTION_LABELS: Record<AngelActionKind, string> = {
  "clear-conversation": "Conversation cleared",
  "forget-place": "Search area forgotten",
}

/** What Undo brings back, stated plainly, including what it cannot bring back. */
export const UNDO_NOTES: Record<AngelActionKind, string> = {
  "clear-conversation": "Undo brings the messages back on this page. They were never saved anywhere.",
  "forget-place": "Undo puts the ZIP or approximate location back for searches. Saved offline map tiles were deleted and are not restored.",
}

export function recordAction(list: AngelAction[], action: Omit<AngelAction, "status">): AngelAction[] {
  return [{ ...action, status: "done" as const }, ...list.filter((entry) => entry.id !== action.id)].slice(0, MAX_RECENT_ACTIONS)
}

/** Marks one action undone. Returns the same list when the action is unknown or already undone. */
export function markUndone(list: AngelAction[], id: string): AngelAction[] {
  if (!list.some((entry) => entry.id === id && entry.status === "done")) return list
  return list.map((entry) => entry.id === id ? { ...entry, status: "undone" as const } : entry)
}

/** The ids that fell off the end of the list, so their restore data can be dropped from memory. */
export function droppedIds(before: AngelAction[], after: AngelAction[]): string[] {
  const kept = new Set(after.map((entry) => entry.id))
  return before.filter((entry) => !kept.has(entry.id)).map((entry) => entry.id)
}
