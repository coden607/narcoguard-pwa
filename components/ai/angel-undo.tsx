"use client"

import { Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ACTION_LABELS, UNDO_NOTES, type AngelAction } from "@/lib/angel-undo"

/** An Undo notice for the latest action, plus a short list of recent actions that can be reversed. */
export function AngelUndo({ actions, onUndo, onDismiss }: { actions: AngelAction[]; onUndo: (id: string) => void; onDismiss: () => void }) {
  if (actions.length === 0) return null
  const latest = actions[0]
  return (
    <section className="space-y-2 rounded-lg border border-border/60 p-3 text-sm break-words" aria-label="Recent actions" data-testid="angel-undo">
      <div className="flex flex-wrap items-center gap-2" role="status" aria-live="polite">
        <p className="min-w-0 flex-1">
          <strong>{ACTION_LABELS[latest.kind]}{latest.status === "undone" ? " — undone" : "."}</strong>
          {latest.status === "done" && <span className="block text-xs text-muted-foreground">{UNDO_NOTES[latest.kind]}</span>}
        </p>
        {latest.status === "done" && (
          <Button type="button" size="sm" variant="outline" className="min-h-11" onClick={() => onUndo(latest.id)} data-testid="angel-undo-latest">
            <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />Undo
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={onDismiss}>Dismiss</Button>
      </div>
      {actions.length > 1 && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2">Recent actions ({actions.length})</summary>
          <ul className="space-y-1">
            {actions.map((action) => (
              <li key={action.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>{ACTION_LABELS[action.kind]}{action.status === "undone" ? " (undone)" : ""}</span>
                {action.status === "done" && <Button type="button" size="sm" variant="ghost" className="min-h-11" onClick={() => onUndo(action.id)}>Undo<span className="sr-only">: {ACTION_LABELS[action.kind]}</span></Button>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
