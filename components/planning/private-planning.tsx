'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { beginPlanning, cleanPlan, activeZip, defaultPlanning, dueReminders, normalizePlanningSession, PLAN_FIELDS, PLANNING_KEY, PlanningConflictError, PlanningPersistenceUnavailableError, readPlanningSession, saveCrisisVersion, savePlanning, withPlanningLock, type Kit, type PlanningState } from '@/lib/planning-private'
import { readLifeSupportState, saveLifeSupportState } from '@/lib/life-support'
import { rankResources, readResourceFeedback, readResourcePreferences } from '@/lib/resource-personalization'
import { RESOURCE_LABELS, type NearbyResource, type ResourceKind } from '@/lib/resource-finder'

const inputClass='block w-full min-w-0 rounded border bg-background p-2'
const panelClass='rounded-xl border p-4 space-y-3 min-w-0'
const planLabels={warningSigns:'Warning signs',firstSteps:'First steps',peopleToContact:'People to contact',safePlaces:'Safe places',reasonsToKeepGoing:'Reasons to keep going'}
type Lookup = {status:string; kinds?:Partial<Record<ResourceKind,{status:string;results:NearbyResource[]}>>}

export function PrivatePlanning() {
  const [enabled,setEnabled]=useState(false),[state,setState]=useState(defaultPlanning)
  const [message,setMessage]=useState(''),[now,setNow]=useState(0)
  const [home,setHome]=useState(''),[destination,setDestination]=useState(''),[travelEnd,setTravelEnd]=useState('')
  const [kit,setKit]=useState<Kit>({id:'',label:'',checked:'',expiry:''})
  const [plan,setPlan]=useState(()=>cleanPlan(null)),[inspect,setInspect]=useState<number|null>(null)
  const [followLabel,setFollowLabel]=useState(''),[followTime,setFollowTime]=useState('')
  const [kind,setKind]=useState<ResourceKind>('food'),[search,setSearch]=useState(false)
  const [lookup,setLookup]=useState<{zip:string;kind:ResourceKind;rows:NearbyResource[];status:string}|null>(null)
  const [busy,setBusy]=useState(false),[searchAttempt,setSearchAttempt]=useState(0)
  const sessionRaw=useRef<string|null>(null)
  const zip=activeZip(state,now)
  const invalidate=useCallback((reason:string)=>{
    sessionRaw.current=null
    setState(defaultPlanning());setEnabled(false);setHome('');setDestination('');setTravelEnd('');setPlan(cleanPlan(null));setInspect(null)
    setKit({id:'',label:'',checked:'',expiry:''});setFollowLabel('');setFollowTime('');setSearch(false);setLookup(null);setBusy(false);setMessage(reason)
  },[])

  useEffect(()=>{
    let live=true
    void withPlanningLock(navigator.locks,()=>{
    if(!live) return
      const saved=normalizePlanningSession(localStorage)
      if(saved) {
        sessionRaw.current=saved.raw
        setState(saved.state);setHome(saved.state.homeZip);setPlan(readLifeSupportState(localStorage).crisisPlan);setEnabled(true)
      }
    setNow(Date.now())
    }).catch(error=>{if(live) setMessage(error instanceof PlanningPersistenceUnavailableError ? error.message : 'Browser storage is unavailable. Private planning cannot be saved here.')})
    const externalChange=(event:StorageEvent)=>{
      if(event.storageArea===localStorage && (event.key===PLANNING_KEY || event.key===null) && sessionRaw.current!==null && localStorage.getItem(PLANNING_KEY)!==sessionRaw.current) {
        invalidate('Private planning changed or was erased in another tab. Drafts cleared. Enable local planning again to continue.')
      }
    }
    window.addEventListener('storage',externalChange)
    return ()=>{live=false;window.removeEventListener('storage',externalChange)}
  },[invalidate])

  async function update(next:PlanningState) {
    const expected=sessionRaw.current
    try {return await withPlanningLock(navigator.locks,()=>{
      if(expected!==sessionRaw.current) throw new PlanningConflictError()
      sessionRaw.current=savePlanning(localStorage,next,enabled,Date.now(),expected ?? undefined);setState(next);setMessage('Saved only in this browser.');return true
    })}
    catch(error) {
      if(error instanceof PlanningConflictError || error instanceof PlanningPersistenceUnavailableError) invalidate(error.message)
      else setMessage('Could not save. Your changes have not been stored.')
      return false
    }
  }

  useEffect(()=>{
    if(!enabled) return
    let active=true
    const tick=async()=>{
      const time=Date.now();setNow(time)
      try {
        await withPlanningLock(navigator.locks,()=>{
        if(!active) return
        if(!sessionRaw.current || localStorage.getItem(PLANNING_KEY)!==sessionRaw.current) throw new PlanningConflictError()
        const previous=sessionRaw.current
        const saved=normalizePlanningSession(localStorage,time)
        if(!saved) throw new PlanningConflictError()
        if(saved.raw!==previous) {
          sessionRaw.current=saved.raw;setState(saved.state)
          if(!saved.state.travel) {setDestination('');setTravelEnd('');setMessage('Travel mode expired. Resource searches now use home ZIP.')}
        }
        })
      } catch(error) {
        if(error instanceof PlanningConflictError) invalidate(error.message)
        else invalidate('Browser storage is unavailable. Drafts cleared; enable local planning again when storage is available.')
      }
    }
    const timer=setInterval(tick,15000)
    window.addEventListener('focus',tick);document.addEventListener('visibilitychange',tick)
    return ()=>{active=false;clearInterval(timer);window.removeEventListener('focus',tick);document.removeEventListener('visibilitychange',tick)}
  },[enabled,invalidate])

  useEffect(()=>{
    if(!enabled || !search || !zip) {
      queueMicrotask(()=>setBusy(false))
      return
    }
    const cancel=new AbortController()
    queueMicrotask(()=>{if(!cancel.signal.aborted) setBusy(true)})
    fetch(`/api/resources/needs?${new URLSearchParams({zip})}`,{cache:'no-store',signal:cancel.signal})
      .then(async response=>{if(!response.ok) throw new Error('Unavailable');return response.json() as Promise<Lookup>})
      .then(body=>{
        if(cancel.signal.aborted || !sessionRaw.current || localStorage.getItem(PLANNING_KEY)!==sessionRaw.current) return
        const found=body.kinds?.[kind]
        const rows=rankResources(found?.results ?? [],readResourcePreferences(localStorage),readResourceFeedback(localStorage))
        setLookup({zip,kind,rows,status:found?.status ?? body.status})
      })
      .catch(()=>{if(!cancel.signal.aborted) setLookup({zip,kind,rows:[],status:'unavailable'})})
      .finally(()=>{if(!cancel.signal.aborted) setBusy(false)})
    return ()=>cancel.abort()
  },[enabled,search,zip,kind,searchAttempt])

  async function enable() {
    try {
      await withPlanningLock(navigator.locks,()=>{
      const current=readPlanningSession(localStorage)
      const saved=beginPlanning(localStorage,current?.state ?? defaultPlanning())
      sessionRaw.current=saved.raw
      setState(saved.state);setHome(saved.state.homeZip);setEnabled(true);setPlan(readLifeSupportState(localStorage).crisisPlan)
      setMessage('Local planning enabled with your consent.')
      })
    } catch(error) {setMessage(error instanceof PlanningPersistenceUnavailableError ? error.message : 'Could not enable local planning. Browser storage is unavailable.')}
  }
  async function eraseAll() {
    const expected=sessionRaw.current
    try {
      await withPlanningLock(navigator.locks,()=>{
      if(!expected || expected!==sessionRaw.current || localStorage.getItem(PLANNING_KEY)!==expected) throw new PlanningConflictError()
      // Remove this tool's snapshots and the shared crisis-plan text, preserving unrelated planner data.
      const life=readLifeSupportState(localStorage)
      localStorage.removeItem(PLANNING_KEY)
      invalidate('Private planning erased from this browser.')
      if(localStorage.getItem(PLANNING_KEY)!==null) throw new PlanningConflictError()
      saveLifeSupportState(localStorage,{...life,crisisPlan:cleanPlan(null)})
      setMessage('Private planning and crisis-plan text erased from this browser.')
      })
    } catch(error) {
      if(error instanceof PlanningConflictError || error instanceof PlanningPersistenceUnavailableError) invalidate(error.message)
      else setMessage('Could not fully erase browser data. Try browser site-data controls.')
    }
  }
  async function savePlan(next=plan) {
    const expected=sessionRaw.current
    try {
      await withPlanningLock(navigator.locks,()=>{
      const clean=cleanPlan(next)
      if(!enabled || !expected || expected!==sessionRaw.current) throw new PlanningConflictError()
      const saved=saveCrisisVersion(localStorage,state,clean,expected)
      sessionRaw.current=saved.raw;setState(saved.state);setPlan(clean);setMessage('Current crisis plan and version saved in this browser.')
      })
    } catch(error) {
      if(error instanceof PlanningConflictError || error instanceof PlanningPersistenceUnavailableError) invalidate(error.message)
      else {
        await withPlanningLock(navigator.locks,()=>{
          const saved=readPlanningSession(localStorage)
          if(!saved || saved.state.consentId!==state.consentId) invalidate('Planning consent changed. Enable local planning again.')
          else {sessionRaw.current=saved.raw;setState(saved.state);setMessage(error instanceof Error ? error.message : 'Could not save crisis plan. Reopen local planning to inspect saved data.')}
        }).catch(()=>invalidate('Private planning is unavailable. Reopen local planning to inspect saved data.'))
      }
    }
  }
  const shown=lookup?.zip===zip && lookup.kind===kind ? lookup : null
  const due=new Set(dueReminders(state,now).map(r=>r.id))
  return <main className="mx-auto max-w-3xl space-y-6 px-4 py-8 break-words">
    <h1 className="text-3xl font-bold">Private planning</h1>
    <p>Optional travel planning, kit notes, crisis-plan versions and resource follow-ups. No account needed. You choose every action.</p>
    <p><Link className="underline" href="/help">Find resources without saving a plan</Link> · <a className="underline" href="tel:911">Call 911 in an emergency</a> · <Link className="underline" href="/safer-use">Emergency response guides</Link></p>
    <p role="status" className="text-sm">{message}</p>
    {!enabled ? <section className={panelClass}>
      <h2 className="text-xl font-semibold">Choose local storage</h2>
      <p>Enable to store ZIP codes, kit labels, personal crisis-plan versions and reminders in this browser. Other people using this browser can read them. Browser data can be lost; this is not a secure backup. You can erase these notes at any time.</p>
      <p>The crisis editor uses the same current plan as Guardian life-support tools. Its earlier versions stay here. Searches send only your active ZIP to the resource directory service after you choose to search.</p>
      <Button onClick={enable}>Enable local planning</Button>
    </section> : <>
      <section className={panelClass}>
        <h2 className="text-xl font-semibold">Travel resource planning</h2>
        <form className="space-y-3" onSubmit={e=>{e.preventDefault();update({...state,homeZip:home})}}>
          <label className="block">Home ZIP<input className={inputClass} inputMode="numeric" pattern="[0-9]{5}" required maxLength={5} value={home} onChange={e=>setHome(e.target.value)} /></label>
          <Button type="submit" variant="outline">Save home ZIP</Button>
        </form>
        <form className="space-y-3" onSubmit={e=>{
          e.preventDefault();const expiresAt=new Date(travelEnd).getTime()
          if(!Number.isFinite(expiresAt) || expiresAt<=Date.now() || expiresAt>Date.now()+31*86400000) {setMessage('Choose a travel end within the next 31 days.');return}
          update({...state,travel:{zip:destination,expiresAt}})
        }}>
          <label className="block">Destination ZIP<input className={inputClass} inputMode="numeric" required pattern="[0-9]{5}" maxLength={5} value={destination} onChange={e=>setDestination(e.target.value)} /></label>
          <label className="block">Travel ends<input className={inputClass} type="datetime-local" required value={travelEnd} onChange={e=>setTravelEnd(e.target.value)} /></label>
          <Button type="submit">Start travel mode</Button>
        </form>
        <p>Active search ZIP: <strong>{zip || 'Set home or destination ZIP'}</strong>{state.travel && state.travel.expiresAt>now ? ` · travel until ${new Date(state.travel.expiresAt).toLocaleString()}` : ' · home'}. Destination overrides home only on this page. No location tracking.</p>
        {state.travel && <Button variant="outline" onClick={async()=>{if(await update({...state,travel:null})) {setDestination('');setTravelEnd('')}}}>Return home / cancel travel</Button>}
        <p className="text-sm">Expiry removes the saved destination while this page is open or next opened. Closed PWAs cannot run an erase timer. Search results switch back to home when travel ends.</p>
        <label className="block">Resource type<select className={inputClass} value={kind} onChange={e=>setKind(e.target.value as ResourceKind)}>{Object.entries(RESOURCE_LABELS).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select></label>
        <Button disabled={!zip || busy} onClick={()=>{setSearch(true);setSearchAttempt(n=>n+1);setLookup(null)}}>Find resources for active ZIP</Button>
        {busy && <p role="status">Searching public directories…</p>}
        {search && !busy && shown && <>
          <p>{shown.status==='ok' ? `Listings for ${shown.zip}, ranked with your resource preferences and feedback.` : 'Live listings are unavailable.'} Hours, eligibility and availability are not confirmed; call first.</p>
          <ul className="space-y-3">{shown.rows.map((row,index)=><li className="rounded border p-3 space-y-2" key={index}>
            <strong>{row.name}</strong><p>{row.address}</p><p>{row.distanceMiles===undefined ? 'Distance unknown' : `${row.distanceMiles} miles from ZIP centre`}. Source: {row.source}</p>
            {row.phone && <a className="underline" href={`tel:${row.phone.replace(/[^\d+]/g,'')}`}>Call {row.name}</a>}
            <Button className="max-w-full h-auto whitespace-normal py-2" variant="outline" onClick={()=>{setFollowLabel(`Follow up: ${row.name}`.slice(0,120));document.getElementById('follow-up-time')?.focus()}}>Choose follow-up for {row.name}</Button>
          </li>)}</ul>
          {shown.rows.length===0 && <p>No matching listings displayed. This does not mean help is unavailable.</p>}
        </>}
        <a className="underline" href="tel:211">Call 211 for local resource help</a>
      </section>

      <section className={panelClass}>
        <h2 className="text-xl font-semibold">Naloxone kit location journal</h2>
        <p>Personal notes only. A location label or date does not establish that a kit is present, stocked or usable. Check the kit and manufacturer instructions.</p>
        <form className="space-y-3" onSubmit={async e=>{e.preventDefault();const next={...kit,id:kit.id || crypto.randomUUID()};if(await update({...state,kits:[...state.kits.filter(k=>k.id!==next.id),next].slice(-30)})) setKit({id:'',label:'',checked:'',expiry:''})}}>
          <label className="block">Kit location label<input className={inputClass} required maxLength={120} value={kit.label} onChange={e=>setKit({...kit,label:e.target.value})} /></label>
          <label className="block">Last personally checked<input className={inputClass} type="date" value={kit.checked} onChange={e=>setKit({...kit,checked:e.target.value})} /></label>
          <label className="block">Expiry date on label (optional)<input className={inputClass} type="date" value={kit.expiry} onChange={e=>setKit({...kit,expiry:e.target.value})} /></label>
          <Button type="submit">Save kit</Button>
        </form>
        <ul className="space-y-2">{state.kits.map(k=><li className="rounded border p-3 space-y-2" key={k.id}><strong>{k.label}</strong><p>Last checked: {k.checked || 'Unknown'}. Label expiry: {k.expiry || 'Unknown'}.</p><div className="flex flex-wrap gap-2"><Button variant="outline" aria-label={`Edit kit ${k.label}`} onClick={()=>setKit(k)}>Edit</Button><Button variant="outline" aria-label={`Erase kit ${k.label}`} onClick={async()=>{if(await update({...state,kits:state.kits.filter(row=>row.id!==k.id)}) && kit.id===k.id) setKit({id:'',label:'',checked:'',expiry:''})}}>Erase</Button></div></li>)}</ul>
        <Button variant="outline" onClick={async()=>{if(await update({...state,kits:[]})) setKit({id:'',label:'',checked:'',expiry:''})}}>Erase kit journal</Button>
      </section>

      <section className={panelClass}>
        <h2 className="text-xl font-semibold">Personal crisis-plan history</h2>
        <p>Write your own steps. Saving also updates your current Guardian life-support crisis plan. Up to 20 versions stay in this browser; no sharing or automated outreach.</p>
        {PLAN_FIELDS.map(key=><label className="block" key={key}>{planLabels[key]}<textarea className={`${inputClass} min-h-20`} maxLength={1200} value={plan[key]} onChange={e=>setPlan({...plan,[key]:e.target.value})}/></label>)}
        <div className="flex flex-wrap gap-2"><Button onClick={()=>savePlan()}>Save crisis-plan version</Button><Button variant="outline" onClick={()=>setPlan(readLifeSupportState(localStorage).crisisPlan)}>Reload current Guardian plan</Button></div>
        <ol className="space-y-2">{state.history.map((v,index)=><li className="rounded border p-3 space-y-2" key={`${v.at}-${index}`}>
          <p>Version {index+1} · {new Date(v.at).toLocaleString()}</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setInspect(inspect===index ? null : index)} aria-expanded={inspect===index}>Inspect version {index+1}</Button><Button variant="outline" onClick={()=>savePlan(v.plan)}>Restore version {index+1}</Button></div>
          {inspect===index && <dl>{PLAN_FIELDS.map(key=><div key={key}><dt className="font-semibold">{planLabels[key]}</dt><dd className="whitespace-pre-wrap">{v.plan[key] || 'Not recorded'}</dd><p className="text-xs">{v.plan[key]===plan[key] ? 'Same as editor' : 'Different from editor'}</p></div>)}</dl>}
        </li>)}</ol>
        <Button variant="outline" onClick={async()=>{if(await update({...state,history:[]})) setInspect(null)}}>Erase version history</Button>
        <p className="text-sm">Erasing history keeps the current crisis plan. “Erase all” below also clears its text from Guardian.</p>
      </section>

      <section className={panelClass}>
        <h2 className="text-xl font-semibold">Private resource follow-ups</h2>
        <p>Choose a reminder after contacting a resource, or write your own. This does not record attendance or infer whether you received help. Reminders appear here only while this page is open; no background push, messages or system notifications.</p>
        <label className="flex items-start gap-2"><input type="checkbox" checked={state.remindersEnabled} onChange={e=>update({...state,remindersEnabled:e.target.checked})}/>Enable foreground follow-up reminders</label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{(['quietStart','quietEnd'] as const).map(key=><label key={key}>{key==='quietStart' ? 'Quiet hours start (local hour)' : 'Quiet hours end (local hour)'}<input className={inputClass} type="number" min={0} max={23} value={state[key]} onChange={e=>{const hour=Number(e.target.value);if(Number.isInteger(hour) && hour>=0 && hour<=23) update({...state,[key]:hour})}}/></label>)}</div>
        <p className="text-sm">Uses this device’s local timezone. Equal start and end pauses reminders all day. Due reminders wait until quiet hours end.</p>
        <form className="space-y-3" onSubmit={async e=>{e.preventDefault();const dueAt=new Date(followTime).getTime();if(!state.remindersEnabled || !Number.isFinite(dueAt) || dueAt<=Date.now()) {setMessage('Enable reminders and choose a future follow-up time.');return}if(await update({...state,reminders:[...state.reminders,{id:crypto.randomUUID(),label:followLabel,dueAt}].slice(-30)})) {setFollowLabel('');setFollowTime('')}}}>
          <label className="block">Follow-up label<input className={inputClass} required maxLength={120} value={followLabel} onChange={e=>setFollowLabel(e.target.value)}/></label>
          <label className="block">Follow-up time<input id="follow-up-time" className={inputClass} type="datetime-local" required value={followTime} onChange={e=>setFollowTime(e.target.value)}/></label>
          <Button type="submit" disabled={!state.remindersEnabled}>Schedule follow-up</Button>
        </form>
        <ul className="space-y-2">{state.reminders.map(r=><li className="rounded border p-3 space-y-2" key={r.id}>
          <strong>{r.label}</strong><p>{new Date(r.dueAt).toLocaleString()}</p>{due.has(r.id) && <p role="status">Your chosen follow-up is due.</p>}
          <div className="flex flex-wrap gap-2"><Button variant="outline" aria-label={`Snooze ${r.label} for 1 hour`} onClick={()=>update({...state,reminders:state.reminders.map(row=>row.id===r.id ? {...row,dueAt:Math.max(Date.now(),row.dueAt)+3600000} : row)})}>Snooze 1 hour</Button><Button variant="outline" aria-label={`Cancel ${r.label}`} onClick={()=>update({...state,reminders:state.reminders.filter(row=>row.id!==r.id)})}>Cancel</Button></div>
        </li>)}</ul>
      </section>
      <section className={panelClass}><h2 className="text-xl font-semibold">Data controls</h2><p>Erase travel/home ZIP, kits, reminders, version history and current crisis-plan text in this browser. Resource help remains available.</p><Button variant="destructive" onClick={eraseAll}>Erase all private planning data</Button></section>
    </>}
  </main>
}
