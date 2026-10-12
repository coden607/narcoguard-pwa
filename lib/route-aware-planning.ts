import type { PlanItem } from "./guardian-stability"
import type { NearbyResource } from "./resource-finder"
import { openNowChip } from "./resource-display"

export type RouteTimingFit = "before" | "around" | "after" | "closed-around" | "unknown"

export function extractPlanZip(location?: string): string | null {
  if (!location) return null
  const match = location.match(/(?:^|\D)(\d{5})(?:-\d{4})?(?=\D|$)/)
  return match?.[1] ?? null
}

export function nextRouteAwarePlan(
  plan: readonly PlanItem[],
  now: { date: string; time: string },
): PlanItem | null {
  return [...plan]
    .filter((item) =>
      !item.done &&
      item.kind === "appointment" &&
      typeof item.time === "string" &&
      typeof item.location === "string" &&
      extractPlanZip(item.location) !== null &&
      item.need !== undefined &&
      (item.date > now.date || (item.date === now.date && item.time >= now.time)),
    )
    .sort((a, b) => \`\${a.date}T\${a.time}\`.localeCompare(\`\${b.date}T\${b.time}\`))[0] ?? null
}

function appointmentDate(plan: PlanItem): Date | null {
  if (!plan.time) return null
  const [year, month, day] = plan.date.split("-").map(Number)
  const [hour, minute] = plan.time.split(":").map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  return new Date(year, month - 1, day, hour, minute, 0, 0)
}

export function routeTimingFit(resource: NearbyResource, plan: PlanItem): RouteTimingFit {
  const at = appointmentDate(plan)
  if (!at || !resource.hours) return "unknown"

  const before = new Date(at.getTime() - 2 * 60 * 60_000)
  const after = new Date(at.getTime() + 2 * 60 * 60_000)
  const exact = openNowChip(resource, at)
  if (exact.tone === "open") return "around"

  const beforeChip = openNowChip(resource, before)
  if (beforeChip.tone === "open") return "before"

  const afterChip = openNowChip(resource, after)
  if (afterChip.tone === "open") return "after"

  if ([exact, beforeChip, afterChip].some((chip) => chip.tone === "unknown")) return "unknown"
  return "closed-around"
}

const FIT_SCORE: Record<RouteTimingFit, number> = {
  around: 0,
  before: 1,
  after: 2,
  unknown: 3,
  "closed-around": 4,
}

export function rankResourcesForPlan(resources: readonly NearbyResource[], plan: PlanItem): NearbyResource[] {
  return [...resources].sort((a, b) =>
    FIT_SCORE[routeTimingFit(a, plan)] - FIT_SCORE[routeTimingFit(b, plan)] ||
    (a.distanceMiles ?? 999) - (b.distanceMiles ?? 999),
  )
}

export function routeTimingLabel(fit: RouteTimingFit): string {
  if (fit === "around") return "Listed hours suggest it may be open around the appointment time."
  if (fit === "before") return "Listed hours suggest it may fit within about 2 hours before the appointment."
  if (fit === "after") return "Listed hours suggest it may fit within about 2 hours after the appointment."
  if (fit === "closed-around") return "Listed hours suggest it is closed around this appointment window."
  return "Timing unknown — call first."
}
