import { matchNeeds } from "@/lib/need-intent"

export type AngelTaskClass = "quick" | "resource" | "reasoning"

export type AngelRoute = {
  task: AngelTaskClass
  maxTokens: number
  temperature: number
  useTools: boolean
}

const RESOURCE_WORDS = /\b(food|meal|pantry|shelter|shower|laundry|water|toilet|clinic|pharmacy|treatment|job|library|near me|nearby|where can i|find help)\b/i
const SMALL_TALK = /^(thanks?|thank you|thx|ok(ay)?|cool|great|nice|hi|hello|hey|bye|goodbye|good ?night|yes|yeah|no|nope|sure|got it|alright)( (so much|you|angel|again))*[.!? ]*$/i
const REASONING_WORDS = /\b(plan|compare|why|explain|strategy|goal|schedule|tomorrow|this week|options|decision)\b/i

/**
 * Token-efficient deterministic routing. This does not choose a paid provider or silently escalate cost;
 * provider/model choice remains an explicit deployment configuration.
 */
export function routeAngelTurn(text: string): AngelRoute {
  const trimmed = text.trim()
  if (RESOURCE_WORDS.test(trimmed)) return { task: "resource", maxTokens: 700, temperature: 0.4, useTools: true }
  if (trimmed.length > 500 || REASONING_WORDS.test(trimmed)) return { task: "reasoning", maxTokens: 900, temperature: 0.5, useTools: true }
  // Needs said in plain words ("I'm starving and have nowhere to sleep") also search for places.
  if (matchNeeds(trimmed).length > 0) return { task: "resource", maxTokens: 700, temperature: 0.4, useTools: true }
  // Pleasantries need no search; anything else may imply a need ("I got kicked out"), so the model may search.
  if (SMALL_TALK.test(trimmed)) return { task: "quick", maxTokens: 300, temperature: 0.6, useTools: false }
  return { task: "quick", maxTokens: 600, temperature: 0.6, useTools: true }
}
