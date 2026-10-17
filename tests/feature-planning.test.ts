import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { PrivatePlanning } from '../components/planning/private-planning'
import { activeZip, beginPlanning, cleanPlanning, defaultPlanning, dueReminders, savePlanning, saveCrisisVersion, readPlanning, readPlanningSession, normalizePlanningSession, PLANNING_KEY, PLANNING_LOCK, snapshotPlan, withPlanningLock, type PlanningLock } from '../lib/planning-private'
import { LIFE_SUPPORT_STORAGE_KEY } from '../lib/life-support'

test('travel overrides home only before expiry; pure reads never write and locked normalization erases expiry', () => {
  const state = defaultPlanning(); state.homeZip = '10001'; state.travel = { zip: '90210', expiresAt: 2000 }
  assert.equal(activeZip(state, 1999), '90210'); assert.equal(activeZip(state, 2000), '10001')
  const data = new Map<string,string>(); const storage = { getItem: (k:string)=>data.get(k) ?? null, setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)} }
  const session=beginPlanning(storage,defaultPlanning(),1000)
  savePlanning(storage, {...state,consentId:session.state.consentId}, true, 1000,session.raw)
  assert.equal(readPlanning(storage, 2000).travel, null)
  assert.equal(JSON.parse(data.get(PLANNING_KEY)!).travel.zip, '90210')
  normalizePlanningSession(storage,2000) // Caller holds the transaction lock in browser code.
  assert.equal(JSON.parse(data.get(PLANNING_KEY)!).travel,null)
})

test('two storage views cannot recreate erased planning through expiry or a stale user edit',()=>{
  const data=new Map<string,string>()
  const view=()=>({getItem:(k:string)=>data.get(k) ?? null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}})
  const a=view(),b=view(),initial=beginPlanning(a,defaultPlanning(),1000)
  const travel={...initial.state,homeZip:'10001',travel:{zip:'90210',expiresAt:2000}}
  const raw=savePlanning(a,travel,true,1000,initial.raw)
  const stale=readPlanningSession(b,1000)!
  a.removeItem(PLANNING_KEY)
  assert.equal(readPlanningSession(b,2000),null)
  assert.throws(()=>savePlanning(b,{...stale.state,travel:null},true,2000,raw))
  assert.throws(()=>savePlanning(b,{...stale.state,homeZip:'30301'},true,2000,stale.raw))
  assert.equal(a.getItem(PLANNING_KEY),null)
  const fresh=beginPlanning(a,defaultPlanning(),2000)
  assert.notEqual(fresh.state.consentId,stale.state.consentId)
  assert.throws(()=>savePlanning(b,stale.state,true,2000,stale.raw))
  assert.equal(readPlanning(a,2000).homeZip,'')
})

test('crisis history quota failure leaves canonical current plan unchanged',()=>{
  const data=new Map<string,string>();let fail=false
  const storage={getItem:(k:string)=>data.get(k) ?? null,setItem:(k:string,v:string)=>{if(fail && k===PLANNING_KEY) throw new Error('Quota');data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const session=beginPlanning(storage)
  data.set(LIFE_SUPPORT_STORAGE_KEY,JSON.stringify({crisisPlan:{firstSteps:'Original'}}))
  const before=data.get(LIFE_SUPPORT_STORAGE_KEY)
  fail=true
  assert.throws(()=>saveCrisisVersion(storage,session.state,cleanPlanForTest('New'),session.raw))
  assert.equal(data.get(LIFE_SUPPORT_STORAGE_KEY),before)
  assert.equal(data.get(PLANNING_KEY),session.raw)
})

test('canonical crisis write failure rolls history back without recreating erased consent',()=>{
  const data=new Map<string,string>();let fail=false
  const storage={getItem:(k:string)=>data.get(k) ?? null,setItem:(k:string,v:string)=>{if(fail && k===LIFE_SUPPORT_STORAGE_KEY) throw new Error('Quota');data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const session=beginPlanning(storage);fail=true
  assert.throws(()=>saveCrisisVersion(storage,session.state,cleanPlanForTest('New'),session.raw))
  assert.deepEqual(readPlanning(storage).history,[])
  storage.removeItem(PLANNING_KEY)
  assert.throws(()=>saveCrisisVersion(storage,session.state,cleanPlanForTest('Again'),session.raw))
  assert.equal(storage.getItem(PLANNING_KEY),null)
})
function cleanPlanForTest(firstSteps:string) {return {warningSigns:'',firstSteps,peopleToContact:'',safePlaces:'',reasonsToKeepGoing:''}}

test('exclusive adapter serializes an erase queued before a stale save, and absent locks fail closed',async()=>{
  let tail=Promise.resolve()
  const names:string[]=[]
  const locks:PlanningLock={request<T>(name:string,operation:()=>T|Promise<T>):Promise<T>{
    names.push(name);const result=tail.then(operation);tail=result.then(()=>{},()=>{});return result
  }}
  const data=new Map<string,string>()
  const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)}}
  const session=await withPlanningLock(locks,()=>beginPlanning(storage))
  let release!:()=>void,entered!:()=>void
  const started=new Promise<void>(resolve=>{entered=resolve})
  const barrier=new Promise<void>(resolve=>{release=resolve})
  const erase=withPlanningLock(locks,async()=>{entered();await barrier;storage.removeItem(PLANNING_KEY)})
  await started
  const stale=withPlanningLock(locks,()=>savePlanning(storage,{...session.state,homeZip:'90210'},true,Date.now(),session.raw))
  const rejected=assert.rejects(stale,/changed or was erased/)
  release();await erase;await rejected
  assert.equal(storage.getItem(PLANNING_KEY),null)
  assert.ok(names.every(name=>name===PLANNING_LOCK))
  let called=false
  await assert.rejects(withPlanningLock(undefined,()=>{called=true}),/Web Locks are unavailable/)
  assert.equal(called,false)
})

test('crisis rollback failure explicitly reports a recoverable retained history version',()=>{
  const data=new Map<string,string>();let armed=false,writes=0
  const storage={getItem:(k:string)=>data.get(k) ?? null,setItem:(k:string,v:string)=>{
    if(armed && (k===LIFE_SUPPORT_STORAGE_KEY || (k===PLANNING_KEY && ++writes>1))) throw new Error('Quota')
    data.set(k,v)
  },removeItem:(k:string)=>{data.delete(k)}}
  const session=beginPlanning(storage);armed=true
  assert.throws(()=>saveCrisisVersion(storage,session.state,cleanPlanForTest('New'),session.raw),/version may remain in history/)
  assert.equal(storage.getItem(LIFE_SUPPORT_STORAGE_KEY),null)
  assert.equal(readPlanning(storage).history[0].plan.firstSteps,'New')
})
test('storage requires consent; malformed and oversized records are bounded', () => {
  const data = new Map<string,string>(); const storage = { getItem:(k:string)=>data.get(k) ?? null,setItem:(k:string,v:string)=>{data.set(k,v)},removeItem:(k:string)=>{data.delete(k)} }
  assert.throws(()=>savePlanning(storage, defaultPlanning(), false))
  const state=cleanPlanning({homeZip:'bad', kits:Array.from({length:80},()=>({id:'a',label:'x'.repeat(500),checked:'bad',expiry:'2027-01-01'})),history:[null],reminders:[null]})
  assert.equal(state.homeZip,''); assert.equal(state.kits.length,30); assert.equal(state.kits[0].label.length,120); assert.equal(state.kits[0].checked,'')
  assert.deepEqual(state.history,[])
})
test('quiet hours across midnight and reminder consent suppress due reminders', () => {
  const state=defaultPlanning(); state.reminders=[{id:'r',label:'Call resource',dueAt:1}]; state.remindersEnabled=true
  assert.equal(dueReminders(state,new Date(2026,9,17,23).getTime()).length,0)
  assert.equal(dueReminders(state,new Date(2026,9,18,9).getTime()).length,1)
  state.remindersEnabled=false; assert.equal(dueReminders(state,new Date(2026,9,18,9).getTime()).length,0)
})
test('crisis history sanitizes snapshots, preserves older versions and is bounded',()=>{
  const state=defaultPlanning(); const plan={warningSigns:' a ',firstSteps:'b',peopleToContact:'',safePlaces:'',reasonsToKeepGoing:''}
  for(let i=0;i<30;i++) state.history=snapshotPlan(state.history,{...plan,firstSteps:String(i)},i+1)
  assert.equal(state.history.length,20); assert.equal(state.history[0].plan.firstSteps,'10'); assert.equal(state.history[19].plan.warningSigns,'a')
})

test('private planning initially exposes consent and public help without private fields',()=>{
  const html=renderToStaticMarkup(createElement(PrivatePlanning))
  assert.ok(html.includes('Enable local planning'))
  assert.ok(html.includes('href="/help"'))
  assert.ok(html.includes('href="tel:911"'))
  assert.ok(!html.includes('Destination ZIP'))
  assert.ok(!html.includes('Kit location label'))
})

test('daytime quiet hours, disabled state, malformed storage and expired travel fail private',()=>{
  const state=defaultPlanning();state.quietStart=9;state.quietEnd=17;state.remindersEnabled=true;state.reminders=[{id:'r',label:'Call',dueAt:1}]
  assert.equal(dueReminders(state,new Date(2026,9,17,12).getTime()).length,0)
  assert.equal(dueReminders(state,new Date(2026,9,17,18).getTime()).length,1)
  state.quietStart=state.quietEnd=8
  assert.equal(dueReminders(state,new Date(2026,9,17,18).getTime()).length,0)
  assert.deepEqual(readPlanning({getItem:()=>'{broken',setItem:()=>{},removeItem:()=>{}}),defaultPlanning())
  assert.equal(cleanPlanning({travel:{zip:'90210',expiresAt:1}},2).travel,null)
})
