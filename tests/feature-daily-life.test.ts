import { strict as assert } from "node:assert"
import { test } from "node:test"
import { buildMorningBrief, clearDailyLifeState, defaultDailyLifeState, readDailyLifeState, saveDailyLifeState } from "../lib/daily-life"
import { tryStorageWrite } from "../lib/browser-storage"

class MemoryStorage {
  value: string | null = null
  getItem() { return this.value }
  setItem(_key:string,value:string) { this.value=value }
  removeItem() { this.value=null }
}

test("Daily Life reports blocked writes and erasure without throwing or claiming persistence", () => {
  const blocked = { getItem() { throw new Error("blocked") }, setItem() { throw new Error("blocked") }, removeItem() { throw new Error("blocked") } }
  assert.equal(tryStorageWrite(() => saveDailyLifeState(blocked, defaultDailyLifeState())), false)
  assert.equal(tryStorageWrite(() => clearDailyLifeState(blocked)), false)
  const storage = new MemoryStorage()
  assert.equal(tryStorageWrite(() => saveDailyLifeState(storage, { ...defaultDailyLifeState(), enabled: true })), true)
  assert.equal(readDailyLifeState(storage).enabled, true)
  assert.equal(tryStorageWrite(() => clearDailyLifeState(storage)), true)
})

test("Daily Life is opt-in and journals are off by default", () => {
  const state=defaultDailyLifeState()
  assert.equal(state.enabled,false)
  assert.equal(state.modules.thoughtJournal,false)
  assert.equal(state.modules.moodJournal,false)
})

test("morning brief picks the next unfinished event and routine", () => {
  const state=defaultDailyLifeState()
  state.enabled=true
  state.schedule=[
    {id:"1",date:"2026-10-07",time:"08:00",title:"Breakfast",done:true},
    {id:"2",date:"2026-10-07",time:"10:00",title:"Work",done:false},
  ]
  state.routines=[{id:"r",title:"Pack lunch",time:"09:00",enabled:true}]
  const brief=buildMorningBrief(state,"2026-10-07","08:30","Weather: clear.")
  assert.equal(brief.nextSchedule?.title,"Work")
  assert.equal(brief.upcomingRoutines[0]?.title,"Pack lunch")
  assert.equal(brief.summary[0],"Weather: clear.")
})

test("Daily Life reader fails closed on malformed local data", () => {
  const storage=new MemoryStorage()
  storage.value="{nope"
  assert.deepEqual(readDailyLifeState(storage),defaultDailyLifeState())
})
