import { strict as assert } from "node:assert"
import { test } from "node:test"
import { buildAngelLocalContext, angelContextHasContent } from "../lib/angel-context"
import { defaultDailyLifeState } from "../lib/daily-life"
import { defaultLifeSupportState } from "../lib/life-support"

test("Angel context contains only compact planning data", () => {
  const daily=defaultDailyLifeState()
  daily.schedule=[{id:"1",date:"2026-10-07",time:"09:00",title:"Work",location:"Downtown",done:false}]
  daily.journal=[{id:"j",date:"2026-10-06",kind:"thought",text:"private journal text"}]
  const support=defaultLifeSupportState()
  support.topGoal="keep my job"
  support.constraints=["no car"]
  support.crisisPlan.warningSigns="private crisis-plan text"
  const context=buildAngelLocalContext(daily,support,{maxDistanceMiles:3,preferFreeFood:true},"2026-10-06")
  const serialized=JSON.stringify(context)
  assert.equal(context.topGoal,"keep my job")
  assert.ok(serialized.includes("Work"))
  assert.ok(!serialized.includes("private journal text"))
  assert.ok(!serialized.includes("private crisis-plan text"))
  assert.equal(angelContextHasContent(context),true)
})
