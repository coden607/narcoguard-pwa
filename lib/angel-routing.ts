export type AngelTaskClass = "quick" | "resource" | "reasoning"

export type AngelRoute = {
  task: AngelTaskClass
  maxTokens: number
  temperature: number
  useTools: boolean
}

const RESOURCE_WORDS = /\b(food|meal|pantry|shelter|shower|laundry|water|toilet|clinic|pharmacy|treatment|job|library|near me|nearby|where can i|find help)\b/i
const REASONING_WORDS = /\b(plan|compare|why|explain|strategy|goal|schedule|tomorrow|this week|options|decision)\b/i

/**
 * Token-efficient deterministic routing. This does not choose a paid provider or silently escalate cost;
 * provider/model choice remains an explicit deployment configuration.
 */
export function routeAngelTurn(text: string): AngelRoute {
  const trimmed = text.trim()
  if (RESOURCE_WORDS.test(trimmed)) return { task: "resource", maxTokens: 700, temperature: 0.25, useTools: true }
  if (trimmed.length > 500 || REASONING_WORDS.test(trimmed)) return { task: "reasoning", maxTokens: 900, temperature: 0.35, useTools: true }
  return { task: "quick", maxTokens: 420, temperature: 0.2, useTools: false }
}
