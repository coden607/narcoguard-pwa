import type { GuardianState } from "./guardian-stability"

export type RewardSummary = {
  points: number
  completedPlans: number
  checkInDays: number
  mealLogs: number
  milestone: number
  nextMilestone: number
}

const MILESTONES = [25, 75, 150, 300, 600, 1000]

export function guardianRewardSummary(state: GuardianState): RewardSummary {
  const checkInDays = state.entries.filter((entry) =>
    Object.keys(entry.needs).length > 0 ||
    entry.sleepHours !== undefined ||
    entry.mood !== undefined ||
    entry.craving !== undefined ||
    entry.isolated !== undefined,
  ).length

  const mealLogs = state.entries.reduce((sum, entry) => sum + Math.min(entry.meals?.length ?? 0, 3), 0)
  const answeredNeeds = state.entries.reduce((sum, entry) => sum + Math.min(Object.keys(entry.needs).length, 4), 0)
  const completedPlans = state.plan.filter((item) => item.done).length

  const points =
    checkInDays * 5 +
    mealLogs * 2 +
    answeredNeeds +
    completedPlans * 10

  const milestone = [...MILESTONES].reverse().find((value) => points >= value) ?? 0
  const nextMilestone = MILESTONES.find((value) => value > points) ?? Math.ceil((points + 1) / 500) * 500

  return { points, completedPlans, checkInDays, mealLogs, milestone, nextMilestone }
}
