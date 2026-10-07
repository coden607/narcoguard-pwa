import { addMeal, type MealKind } from "./meal-log"
import type { CheckIn, Need, NeedStatus } from "./guardian-stability"

export type ObservationSource = "user_action" | "trusted_integration" | "assistant_inference"

export type NeedObservation = {
  need: Need
  status?: NeedStatus
  source: ObservationSource
  confidence: "certain" | "uncertain"
}

export type MealObservation = {
  kind?: MealKind
  note?: string
  source: ObservationSource
  confidence: "certain" | "uncertain"
}

export type ObservationResult<T> =
  | { action: "logged"; value: T }
  | { action: "ask"; question: string }

/**
 * Auto-log only facts established by a direct user action or a trusted integration.
 * Inferences and uncertain observations must become a confirmation question instead.
 */
export function applyNeedObservation(entry: CheckIn, observation: NeedObservation): ObservationResult<CheckIn> {
  if (
    observation.confidence !== "certain" ||
    observation.source === "assistant_inference" ||
    observation.status === undefined
  ) {
    return { action: "ask", question: `Is your ${observation.need} need met right now?` }
  }

  return {
    action: "logged",
    value: { ...entry, needs: { ...entry.needs, [observation.need]: observation.status } },
  }
}

export function applyMealObservation(entry: CheckIn, observation: MealObservation, id: string): ObservationResult<CheckIn> {
  if (
    observation.confidence !== "certain" ||
    observation.source === "assistant_inference" ||
    observation.kind === undefined
  ) {
    return { action: "ask", question: "Did you eat something you want me to log?" }
  }

  return {
    action: "logged",
    value: addMeal(entry, observation.kind, observation.note ?? "", id),
  }
}
