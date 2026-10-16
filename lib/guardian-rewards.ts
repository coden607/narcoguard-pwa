import type { GuardianState } from "./guardian-stability"

export type RewardSummary = {
  points: number
  completedPlans: number
  checkInDays: number
  mealLogs: number
  answeredNeeds: number
  milestone: number
  nextMilestone: number
}

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
  const selected = new Set(state.rewardCategories)

  const points =
    (selected.has("checkins") ? checkInDays * 5 : 0) +
    (selected.has("meals") ? mealLogs * 2 : 0) +
    (selected.has("needs") ? answeredNeeds : 0) +
    (selected.has("plans") ? completedPlans * 10 : 0)

  const step = [25, 50, 100, 250].includes(state.rewardMilestoneStep)
    ? state.rewardMilestoneStep
    : 50
  const milestone = Math.floor(points / step) * step
  const nextMilestone = milestone + step

  return { points, completedPlans, checkInDays, mealLogs, answeredNeeds, milestone, nextMilestone }
}
