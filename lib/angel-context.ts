import type { DailyLifeState } from "./daily-life"
import type { LifeSupportState } from "./life-support"
import type { ResourcePreferences } from "./resource-personalization"

export interface AngelLocalContext {
  topGoal?: string
  constraints?: string[]
  upcoming?: string[]
  routines?: string[]
  transport?: string[]
  resourcePreferences?: string[]
}

export function buildAngelLocalContext(
  daily: DailyLifeState,
  support: LifeSupportState,
  resources: ResourcePreferences,
  nowDate: string,
): AngelLocalContext {
  const upcoming = daily.schedule
    .filter((item) => !item.done && item.date >= nowDate)
    .sort((a,b)=>(a.date+(a.time??"")).localeCompare(b.date+(b.time??"")))
    .slice(0,5)
    .map((item)=>`${item.date}${item.time ? " "+item.time : ""}: ${item.title}${item.location ? " @ "+item.location : ""}`)

  const routines = daily.routines
    .filter((item)=>item.enabled)
    .slice(0,8)
    .map((item)=>`${item.time ? item.time+" " : ""}${item.title}`)

  const transport = [support.transport.primary, support.transport.backup, support.transport.fallback].filter(Boolean).slice(0,3)
  const resourcePreferences:string[]=[]
  if (resources.maxDistanceMiles !== null) resourcePreferences.push(`Prefer options within ${resources.maxDistanceMiles} miles.`)
  if (resources.preferFreeFood) resourcePreferences.push("Prefer free/community food before paid quick-meal options.")

  return {
    ...(support.topGoal ? { topGoal:support.topGoal.slice(0,200) } : {}),
    ...(support.constraints.length ? { constraints:support.constraints.slice(0,12) } : {}),
    ...(upcoming.length ? { upcoming } : {}),
    ...(routines.length ? { routines } : {}),
    ...(transport.length ? { transport } : {}),
    ...(resourcePreferences.length ? { resourcePreferences } : {}),
  }
}

export function angelContextHasContent(context: AngelLocalContext) {
  return Boolean(context.topGoal || context.constraints?.length || context.upcoming?.length || context.routines?.length || context.transport?.length || context.resourcePreferences?.length)
}
