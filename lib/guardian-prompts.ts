import type {
  CheckIn,
  GuardianState,
  PromptCategory,
  PromptWindow,
} from "./guardian-stability"

export type GentlePrompt = {
  category: PromptCategory
  title: string
  detail: string
  reason: string
}

const minutesOfDay = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

export function timeInPromptWindow(time: string, window: PromptWindow) {
  const now = minutesOfDay(time)
  const start = minutesOfDay(window.start)
  const end = minutesOfDay(window.end)
  if (now === null || start === null || end === null) return false
  if (start === end) return true
  return start < end
    ? now >= start && now <= end
    : now >= start || now <= end
}

const enabledNow = (state: GuardianState, category: PromptCategory, time: string) =>
  state.promptWindows.some((window) =>
    window.category === category &&
    window.enabled &&
    timeInPromptWindow(time, window),
  )

export function gentlePrompts(
  state: GuardianState,
  today: CheckIn,
  now: { date: string; time: string },
): GentlePrompt[] {
  if (state.paused) return []
  const prompts: GentlePrompt[] = []

  if (enabledNow(state, "food", now.time) && today.needs.food !== "met") {
    prompts.push({
      category: "food",
      title: "Food check-in",
      detail: "If food is still unsettled, you could choose a meal, pantry, or food-resource step now.",
      reason: today.needs.food === "needs-help"
        ? "You marked food as needing help today."
        : "Food is still unanswered today, so this stays a suggestion rather than an assumption.",
    })
  }

  if (enabledNow(state, "sleep", now.time) && today.needs.sleep !== "met") {
    prompts.push({
      category: "sleep",
      title: "Sleep setup",
      detail: "If it would help, you could make one small choice for tonight: charging nearby, water ready, an alarm, or a calmer wind-down.",
      reason: today.needs.sleep === "needs-help"
        ? "You marked sleep as needing help today."
        : "Sleep is still unanswered today; NarcoGuard is not treating that as a problem.",
    })
  }

  if (enabledNow(state, "hygiene", now.time) && today.needs.hygiene !== "met") {
    prompts.push({
      category: "hygiene",
      title: "Hygiene check-in",
      detail: "If you want, this can be a good time to handle supplies, laundry, a shower plan, or another hygiene step.",
      reason: today.needs.hygiene === "needs-help"
        ? "You marked hygiene as needing help today."
        : "Hygiene is unanswered today, so this is only your scheduled prompt.",
    })
  }

  if (enabledNow(state, "appointments", now.time)) {
    const due = state.plan
      .filter((item) => !item.done && item.kind === "appointment" && item.date === now.date)
      .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"))[0]
    if (due) {
      prompts.push({
        category: "appointments",
        title: "Appointment check-in",
        detail: `You have “${due.title}” on today’s plan${due.time ? ` at ${due.time}` : ""}. Verify details with the provider before relying on them.`,
        reason: "This comes from an appointment you entered yourself and have not marked complete.",
      })
    }
  }

  if (enabledNow(state, "connection", now.time) && today.needs.connection !== "met") {
    prompts.push({
      category: "connection",
      title: "Connection check-in",
      detail: "If you want contact, consider a person or community connection you already trust.",
      reason: today.isolated === true
        ? "You recorded feeling isolated today."
        : today.needs.connection === "needs-help"
          ? "You marked connection as needing help today."
          : "Connection is unanswered today, so this is only your scheduled reminder.",
    })
  }

  if (enabledNow(state, "resources", now.time)) {
    const needs = Object.entries(today.needs)
      .filter(([, status]) => status === "needs-help")
      .map(([need]) => need)
    const unfinished = state.plan.filter((item) => !item.done && item.date <= now.date && item.need)
    if (needs.length > 0 || unfinished.length > 0) {
      prompts.push({
        category: "resources",
        title: "Resource follow-through",
        detail: "If you still want help with something you recorded, you can review a resource, call ahead, or choose one next step. Availability is never assumed.",
        reason: needs.length > 0
          ? `You marked ${needs.length} need${needs.length === 1 ? "" : "s"} as needing help today.`
          : "You have an unfinished plan item linked to a need you chose.",
      })
    }
  }

  return prompts
}
