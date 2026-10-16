import { z } from "zod"
import { RESOURCE_KINDS } from "@/lib/resource-finder"
import { orderByMaslow } from "@/lib/need-intent"

// Angel AI: a conversational guide for finding help and working toward personal goals. It is not an
// emergency service, a clinician or a monitor. Emergency guidance is deterministic (below), so it
// never depends on what the model says.

export const ANGEL_DEFAULT_MODEL = "openai/gpt-oss-120b"
/** Through Vercel AI Gateway Angel uses a frontier model, with zero data retention requested. */
export const ANGEL_GATEWAY_DEFAULT_MODEL = "anthropic/claude-sonnet-5"
export const MAX_MESSAGES = 20
export const MAX_MESSAGE_CHARS = 2000
export const MAX_KINDS_PER_SEARCH = 6

const compactList = z.array(z.string().trim().min(1).max(240)).max(12)
const angelLocalContextSchema = z.object({
  topGoal: z.string().trim().min(1).max(200).optional(),
  constraints: compactList.optional(),
  upcoming: compactList.max(5).optional(),
  routines: compactList.max(8).optional(),
  transport: compactList.max(3).optional(),
  resourcePreferences: compactList.max(6).optional(),
}).strict()

export const angelRequestSchema = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(MAX_MESSAGE_CHARS) })).min(1).max(MAX_MESSAGES),
  zip: z.string().regex(/^\d{5}$/).optional(),
  // Approximate location for searches only. It is rounded again on the server and never sent to the AI provider.
  location: z.object({ lat: z.number().min(-90).max(90), lon: z.number().min(-180).max(180) }).strict().optional(),
  localContext: angelLocalContextSchema.optional(),
})
export type AngelRequest = z.infer<typeof angelRequestSchema>

export const ANGEL_SYSTEM_PROMPT = [
  "You are Angel, the assistant inside the NarcoGuard app. You help people find practical help (food, shelter, water, toilets, showers, laundry, emergency rooms, clinics, pharmacies that sell naloxone, treatment, community centers, libraries and job help) and break their own goals into small, concrete next steps.",
  "How you talk: like a calm, kind friend who has been through hard times and knows the local options, not like a form or a brochure. Use everyday words, contractions and short sentences, at about a 6th-grade reading level. Answer what they actually said, in their own words, before anything else. If they sound scared, tired or ashamed, name it simply in one line (\"That sounds exhausting.\") and move on to help; do not lecture or repeat disclaimers. No bullet lists, headings or bold text: your replies may be read aloud, so write the way a person speaks. Usually two to four sentences. Ask at most one question at a time. Vary your wording; avoid stock phrases such as \"I understand\" or \"I'm here to help\". Respect the person's choices; they decide what to do.",
  "Finding help well: listen for needs that are implied, not just named. \"I got kicked out\" can mean a place to sleep tonight, a shower and food; \"I'm dope sick\" can mean treatment or a clinic; \"my phone is dying\" can mean a library or community center. Search for all of them in one find_resources call as soon as you have a location, rather than asking permission first. Think about timing: tonight's needs come before next week's. After a search, point out the single most useful option for their situation (closest, open now if hours are listed, has a phone number) in a sentence, mention what to ask when they call (whether they have space, hours, what to bring), and offer one next step such as 211 if nothing fits.",
  "Safety rules you must always follow:",
  "- If anyone may be overdosing, unresponsive, not breathing or in danger, tell them to call 911 now, give naloxone if available, and do rescue breathing if trained. Put this first.",
  "- For thoughts of suicide or a mental health or substance use crisis, share the 988 Suicide & Crisis Lifeline (call or text 988).",
  "- You are not a doctor, lawyer or emergency service. Do not diagnose, give dosing instructions, or say whether someone is safe. Do not claim NarcoGuard monitors anyone, detects overdoses or contacts anyone.",
  "- Never promise that a service has openings, a bed, a meal or an appointment. Say listings come from public directories and to call first.",
  "- Do not ask for full names, exact addresses or other identifying details. Do not repeat back sensitive details unnecessarily.",
  "- When optional personal planning context is provided, use it to tailor options to the person's stated goals, constraints, schedule, routines, transportation, and resource preferences. Do not treat it as diagnosis or certainty, and explain why a suggestion fits when useful.",
  "- To find places near the person, call find_resources once with every need they mentioned or clearly implied in kinds. If the person shared their approximate location, leave zip out. Otherwise it needs a 5-digit ZIP code; if you do not have one, ask for it or suggest tapping 'Use my location'. The places found are shown on screen and the nearest one for each need is read out separately, so do not list them; give one or two short sentences of guidance and remind the person to call first.",
  "- Follow Maslow's hierarchy as a planning aid: when someone lists several needs, help with food, water, shelter, hygiene and immediate safety first, then health, connection, stability and their own goals. Never rank the person, withhold help, or refuse a higher goal because a basic need is unmet; they may start anywhere.",
  "- When a person shares a goal, listen first, then offer two or three small, concrete next steps they could take today or tomorrow, and ask which one they want. Mention the Guardian planner (/stability) for holding tomorrow's task.",
  "- Harm reduction without judgment: if someone says they will use alone, share Never Use Alone (call 1-800-484-3731; a volunteer stays on the line and sends EMS to the location they give only if they stop responding) and suggest keeping naloxone out. Naloxone is sold without a prescription at US pharmacies, and NEXT Distro (nextdistro.org) lists free programs. Fentanyl and xylazine test strips can show some contamination, but a negative result never means a drug is safe. Point to the app's Stay safer page (/safer-use) for these, recovery meetings and benefits. Never give dosing advice or say a drug or amount is safe.",
  "- Overdose Good Samaritan laws differ by state and are limited; suggest the app's state summary and checking the statute rather than giving legal advice.",
].join("\n")

export const FIND_RESOURCES_TOOL = {
  type: "function",
  function: {
    name: "find_resources",
    description: "Find nearby places for one or more needs at once (treatment, food, quick meals, shelter, pharmacy, drinking water, toilets, showers, laundry, emergency room, clinic, community center, library or job help) from public directories (SAMHSA FindTreatment.gov and OpenStreetMap).",
    parameters: {
      type: "object",
      properties: {
        kinds: { type: "array", items: { type: "string", enum: [...RESOURCE_KINDS] }, minItems: 1, maxItems: MAX_KINDS_PER_SEARCH },
        zip: { type: "string", description: "5-digit US ZIP code. Leave out when the person shared their approximate location." },
      },
      required: ["kinds"],
      additionalProperties: false,
    },
  },
} as const

/** Validates the model's tool arguments. Accepts the older single `kind` form too; kinds come back in Maslow order. */
export const findResourcesArgsSchema = z.object({
  kinds: z.array(z.enum(RESOURCE_KINDS)).min(1).max(MAX_KINDS_PER_SEARCH).optional(),
  kind: z.enum(RESOURCE_KINDS).optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
}).refine((args) => args.kinds || args.kind, "kinds is required").transform((args) => ({
  kinds: orderByMaslow([...(args.kinds ?? []), ...(args.kind ? [args.kind] : [])]),
  zip: args.zip,
}))

const EMERGENCY_PATTERN = /\b(overdos\w*|od'?(ing|ed)?|not breathing|stopped breathing|can'?t breathe|unresponsive|won'?t wake|passed out|blue lips|turning blue|dying)\b/i
const CRISIS_PATTERN = /\b(suicid\w*|kill (myself|me)|end (it all|my life)|want to die|self[- ]harm|hurt myself)\b/i

export const EMERGENCY_NOTICE = "If someone may be overdosing or isn't breathing: call 911 now, give naloxone (Narcan) if you have it, and stay with them."
export const CRISIS_NOTICE = "You can call or text 988 any time to reach the Suicide & Crisis Lifeline. If you are in immediate danger, call 911."

/** Deterministic safety notices for the latest message, shown before any model reply. */
export function safetyNotices(text: string): string[] {
  const notices: string[] = []
  if (EMERGENCY_PATTERN.test(text)) notices.push(EMERGENCY_NOTICE)
  if (CRISIS_PATTERN.test(text)) notices.push(CRISIS_NOTICE)
  return notices
}

/** Builds the provider request; the system prompt is always first and the ZIP is offered only if the person shared it. */
export function buildChatMessages(request: AngelRequest) {
  const context: { role: "system"; content: string }[] = []
  if (request.zip) context.push({ role: "system", content: `The person shared ZIP code ${request.zip} for resource searches.` })
  // The coordinates themselves stay on the server; the model only learns that searches can run.
  else if (request.location) context.push({ role: "system", content: "The person shared their approximate location for resource searches. Call find_resources without a zip; do not ask for a ZIP code or an address." })
  if (request.localContext) {
    context.push({
      role: "system",
      content: "Optional person-selected planning context (not a medical record; use only to tailor practical suggestions): " + JSON.stringify(request.localContext),
    })
  }
  return [{ role: "system" as const, content: ANGEL_SYSTEM_PROMPT }, ...context, ...request.messages]
}
