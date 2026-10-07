export type AngelLocalCommand =
  | { type: "navigate"; href: "/stability" | "/daily-life" | "/ar" | "/help" }
  | { type: "clear" }
  | { type: "read_aloud"; enabled: boolean }

const clean = (text: string) => text.trim().toLowerCase().replace(/[.,!?]+$/g, "")

export function parseAngelLocalCommand(text: string): AngelLocalCommand | null {
  const value = clean(text)
  if (/^(open|go to|show) (my )?(needs )?(planner|stability)$/.test(value)) return { type: "navigate", href: "/stability" }
  if (/^(open|go to|show) (my )?(daily life|day|schedule|routine|journal)$/.test(value)) return { type: "navigate", href: "/daily-life" }
  if (/^(open|go to|show) (the )?(training|tutorials?)$/.test(value)) return { type: "navigate", href: "/ar" }
  if (/^(open|go to|show) (find )?help$/.test(value)) return { type: "navigate", href: "/help" }
  if (/^(clear|erase) (the )?(chat|conversation)$/.test(value)) return { type: "clear" }
  if (/^(turn on|enable|start) (read aloud|reading aloud|voice replies)$/.test(value)) return { type: "read_aloud", enabled: true }
  if (/^(turn off|disable|stop) (read aloud|reading aloud|voice replies)$/.test(value)) return { type: "read_aloud", enabled: false }
  return null
}
