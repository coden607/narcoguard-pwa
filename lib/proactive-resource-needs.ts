import { NEEDS, type CheckIn, type Need, type PlanItem } from "./guardian-stability"

export type ProactiveCue = {
  id: string
  need: Need
  title: string
  detail: string
  horizon: "today" | "tomorrow"
}

export type PendingQuestion = {
  id: string
  need: Need
  question: string
  reason: string
}

type PlannerClock = { date: string; time: string }

const minutesOf = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number)
  return hours * 60 + minutes
}

const dayOffset = (date: string, offset: number): string => {
  const value = new Date(date + "T12:00:00")
  value.setDate(value.getDate() + offset)
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
}

const recentExplicit = (entries: readonly CheckIn[], today: string, need: Need, count: number) =>
  entries
    .filter((entry) => entry.date < today && entry.needs[need] !== undefined)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count)

export function anticipateResourceNeeds({
  entries,
  today,
  plan,
  now,
}: {
  entries: readonly CheckIn[]
  today: CheckIn
  plan: readonly PlanItem[]
  now: PlannerClock
}): ProactiveCue[] {
  const cues = new Map<Need, ProactiveCue>()
  const add = (cue: ProactiveCue) => { if (!cues.has(cue.need)) cues.set(cue.need, cue) }

  for (const need of NEEDS) {
    if (today.needs[need] !== undefined) continue
    const recent = recentExplicit(entries, now.date, need, 3)
    const unmet = recent.filter((entry) => entry.needs[need] === "needs-help").length
    if (recent.length >= 2 && unmet >= 2) {
      add({
        id: `repeat-${need}`,
        need,
        horizon: "today",
        title: "Plan ahead from a recent pattern",
        detail: `You marked ${need} as needing help on ${unmet} of your last ${recent.length} answered check-ins for this need. NarcoGuard can look up options now; this is a planning cue, not a prediction.`,
      })
    }
  }

  const currentMinutes = minutesOf(now.time)
  const breakfastLogged = (today.meals ?? []).some((meal) => meal.kind === "breakfast")
  const recentMealDays = entries
    .filter((entry) => entry.date < now.date)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .filter((entry) => (entry.meals?.length ?? 0) > 0).length
  const mealTrackingActive = (today.meals?.length ?? 0) > 0 || recentMealDays >= 2

  if (today.needs.food === undefined && mealTrackingActive && !breakfastLogged && currentMinutes >= 690 && currentMinutes <= 900) {
    add({
      id: "breakfast-check",
      need: "food",
      horizon: "today",
      title: "Food check before the afternoon",
      detail: "No breakfast is logged yet and you have used meal logging recently. NarcoGuard can surface food options now. A missing log is not treated as proof that you did not eat.",
    })
  }

  const tomorrow = dayOffset(now.date, 1)
  const earlyTomorrow = plan.some((item) => item.date === tomorrow && !item.done && item.time && minutesOf(item.time) <= 660)
  if (earlyTomorrow && today.needs.food !== "met") {
    const recentFood = recentExplicit(entries, now.date, "food", 2)
    if (today.needs.food === "needs-help" || recentFood.some((entry) => entry.needs.food === "needs-help")) {
      cues.set("food", {
        id: "food-before-morning-plan",
        need: "food",
        horizon: "tomorrow",
        title: "Line up food before tomorrow morning",
        detail: "You have an early plan tomorrow and an explicit recent food need. NarcoGuard can look up food resources now so you can decide what fits your route and schedule.",
      })
    }
  }

  const recentHygiene = recentExplicit(entries, now.date, "hygiene", 3)
  if (currentMinutes >= 18 * 60 && today.needs.hygiene === undefined && recentHygiene.filter((entry) => entry.needs.hygiene === "needs-help").length >= 2) {
    add({
      id: "hygiene-evening-plan",
      need: "hygiene",
      horizon: "tomorrow",
      title: "Set up hygiene options for tomorrow",
      detail: "Recent check-ins repeatedly marked hygiene as needing help. NarcoGuard can find shower and hygiene options tonight rather than waiting until tomorrow.",
    })
  }

  return [...cues.values()]
}

export function questionsForUnknowns(today: CheckIn, cues: readonly ProactiveCue[]): PendingQuestion[] {
  const questions: PendingQuestion[] = []
  for (const cue of cues) {
    if (today.needs[cue.need] !== undefined) continue
    questions.push({
      id: `confirm-${cue.id}`,
      need: cue.need,
      question: `Is your ${cue.need} need met right now?`,
      reason: cue.detail,
    })
  }
  return questions
}
