import { LIFE_SUPPORT_STORAGE_KEY, readLifeSupportState, saveLifeSupportState, type CrisisPlan } from './life-support'

export const PLANNING_KEY = 'narcoguard_private_planning_v1'
export const PLANNING_LOCK = 'narcoguard-private-planning'
export interface PlanningLock {request<T>(name:string,callback:()=>T|Promise<T>):Promise<T>}
export class PlanningPersistenceUnavailableError extends Error {
  constructor() {super('Private planning cannot be saved safely in this browser because Web Locks are unavailable. Public resource help remains available.')}
}
export async function withPlanningLock<T>(locks:PlanningLock|undefined,operation:()=>T|Promise<T>):Promise<T> {
  if(!locks?.request) throw new PlanningPersistenceUnavailableError()
  return locks.request(PLANNING_LOCK,operation)
}
export type Kit = { id: string; label: string; checked: string; expiry: string }
export type PlanVersion = { at: number; plan: CrisisPlan }
export type FollowUp = { id: string; label: string; dueAt: number }
export type PlanningState = {
  consentId: string;
  homeZip: string; travel: {zip: string; expiresAt: number} | null; kits: Kit[]; history: PlanVersion[];
  reminders: FollowUp[]; remindersEnabled: boolean; quietStart: number; quietEnd: number
}
type Storage = {getItem(k: string): string | null; setItem(k: string,v: string): void; removeItem(k: string): void}
const text = (v: unknown, max = 120) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,max) : ''
const zip = (v: unknown) => /^\d{5}$/.test(text(v)) ? text(v) : ''
const date = (v: unknown) => {
  const value=text(v), time=Date.parse(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(time) && new Date(time).toISOString().slice(0,10)===value ? value : ''
}
const object = (v: unknown): Record<string,unknown> => v && typeof v === 'object' ? v as Record<string,unknown> : {}
const rows = (v: unknown) => Array.isArray(v) ? v : []
export const PLAN_FIELDS = ['warningSigns','firstSteps','peopleToContact','safePlaces','reasonsToKeepGoing'] as const
export function cleanPlan(value: unknown): CrisisPlan {
  const input = object(value)
  return Object.fromEntries(PLAN_FIELDS.map(key=>[key,text(input[key],1200)])) as unknown as CrisisPlan
}
export function defaultPlanning(): PlanningState {return {consentId:'',homeZip:'',travel:null,kits:[],history:[],reminders:[],remindersEnabled:false,quietStart:22,quietEnd:8}}
export function cleanPlanning(value: unknown, now=Date.now()): PlanningState {
  const v=object(value), travel=object(v.travel)
  const hour=(value:unknown,fallback:number)=>typeof value==='number' && Number.isInteger(value) && value>=0 && value<=23 ? value : fallback
  return {
    consentId:text(v.consentId,80),
    homeZip:zip(v.homeZip), travel: zip(travel.zip) && typeof travel.expiresAt==='number' && travel.expiresAt>now && travel.expiresAt<=now+31*86400000 ? {zip:zip(travel.zip),expiresAt:travel.expiresAt} : null,
    kits: rows(v.kits).flatMap(item=>{const r=object(item); return text(r.label) && text(r.id) ? [{id:text(r.id),label:text(r.label),checked:date(r.checked),expiry:date(r.expiry)}] : []}).slice(-30),
    history:rows(v.history).flatMap(item=>{const r=object(item);return typeof r.at==='number' && Number.isFinite(r.at) && r.plan ? [{at:r.at,plan:cleanPlan(r.plan)}] : []}).slice(-20),
    reminders:rows(v.reminders).flatMap(item=>{const r=object(item);return text(r.id) && text(r.label) && typeof r.dueAt==='number' && Number.isFinite(r.dueAt) ? [{id:text(r.id),label:text(r.label),dueAt:r.dueAt}] : []}).slice(-30),
    remindersEnabled:v.remindersEnabled===true,quietStart:hour(v.quietStart,22),quietEnd:hour(v.quietEnd,8),
  }
}
export function activeZip(state: PlanningState, now=Date.now()) {return state.travel && state.travel.expiresAt>now ? state.travel.zip : state.homeZip}
export class PlanningConflictError extends Error {
  constructor() {super('Planning changed or was erased in another tab. Enable local planning again before saving.')}
}
export type PlanningSession = {state:PlanningState;raw:string}
export function beginPlanning(storage:Storage,state=defaultPlanning(),now=Date.now()): PlanningSession {
  const next={...cleanPlanning(state,now),consentId:crypto.randomUUID()}
  const raw=JSON.stringify(next)
  storage.setItem(PLANNING_KEY,raw)
  return {state:next,raw}
}
export function readPlanningSession(storage:Storage,now=Date.now()): PlanningSession | null {
  try {
    const raw=storage.getItem(PLANNING_KEY)
    if(!raw || raw.length>200000) return null
    const parsed=JSON.parse(raw), state=cleanPlanning(parsed,now)
    if(!state.consentId) return null
    return {state,raw}
  } catch {return null}
}
export function readPlanning(storage: Storage, now=Date.now()): PlanningState {return readPlanningSession(storage,now)?.state ?? defaultPlanning()}
// Mutators below are synchronous building blocks, not transactions. Every browser caller
// must hold PLANNING_LOCK, including normalization, initialization and erasure.
export function normalizePlanningSession(storage:Storage,now=Date.now()):PlanningSession|null {
  const session=readPlanningSession(storage,now)
  if(!session) return null
  if(JSON.stringify(session.state)===session.raw) return session
  return {state:session.state,raw:savePlanning(storage,session.state,true,now,session.raw)}
}
export function savePlanning(storage: Storage,state:PlanningState,consent:boolean,now=Date.now(),expectedRaw?:string) {
  if(!consent) throw new Error('Local storage consent is required')
  if(!expectedRaw || storage.getItem(PLANNING_KEY)!==expectedRaw || !state.consentId || object(JSON.parse(expectedRaw)).consentId!==state.consentId) throw new PlanningConflictError()
  const raw=JSON.stringify(cleanPlanning(state,now))
  storage.setItem(PLANNING_KEY,raw)
  return raw
}
export function saveCrisisVersion(storage:Storage,state:PlanningState,plan:CrisisPlan,expectedRaw:string,now=Date.now()): PlanningSession {
  const previousLife=storage.getItem(LIFE_SUPPORT_STORAGE_KEY)
  const life=readLifeSupportState(storage),clean=cleanPlan(plan)
  const next={...state,history:snapshotPlan(state.history,clean,now)}
  let raw:string
  try {raw=savePlanning(storage,next,true,now,expectedRaw)}
  catch(error) {
    if(error instanceof PlanningConflictError) throw error
    throw new Error('Could not save version history. The current crisis plan was not changed.')
  }
  try {
    if(storage.getItem(PLANNING_KEY)!==raw || storage.getItem(LIFE_SUPPORT_STORAGE_KEY)!==previousLife) throw new PlanningConflictError()
    saveLifeSupportState(storage,{...life,crisisPlan:clean})
    return {state:next,raw}
  } catch(error) {
    try {savePlanning(storage,state,true,now,raw)}
    catch {
      throw new Error('Current crisis-plan save failed. A version may remain in history; reopen local planning to inspect and erase it. Changes from another tab were preserved.')
    }
    if(error instanceof PlanningConflictError) throw error
    throw new Error('Current crisis plan was not saved. Version history was restored; try again when browser storage is available.')
  }
}
export function snapshotPlan(history:PlanVersion[],plan:CrisisPlan,at=Date.now()) {return [...history,{at,plan:cleanPlan(plan)}].slice(-20)}
export function dueReminders(state:PlanningState,now=Date.now()): FollowUp[] {
  if(!state.remindersEnabled) return []
  const hour=new Date(now).getHours(),{quietStart:s,quietEnd:e}=state
  const quiet=s===e || (s<e ? hour>=s && hour<e : hour>=s || hour<e)
  return quiet ? [] : state.reminders.filter(r=>r.dueAt<=now)
}
