"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  clearLifeSupportState,
  defaultLifeSupportState,
  disruptionSteps,
  readLifeSupportState,
  saveLifeSupportState,
  type LifeSupportState,
} from "@/lib/life-support"

export function LifeSupportTools() {
  const [state, setState] = useState<LifeSupportState | null>(null)
  const [constraint, setConstraint] = useState("")
  const [task, setTask] = useState("")
  const [doc, setDoc] = useState("")

  useEffect(() => {
    const timer = window.setTimeout(() => setState(readLifeSupportState(window.localStorage)), 0)
    return () => window.clearTimeout(timer)
  }, [])
  const update = (next: LifeSupportState) => {
    saveLifeSupportState(window.localStorage, next)
    setState(next)
  }
  const resetSteps = useMemo(() => state ? disruptionSteps(state) : [], [state])

  if (!state) return <section className="border rounded-xl p-5" role="status">Loading personal support tools…</section>
  if (!state.enabled) return <section className="border rounded-xl p-5 space-y-3">
    <h2 className="text-xl font-semibold">Personal support tools</h2>
    <p className="text-sm text-muted-foreground">Optional continuity, transportation backup, document checklist, personal crisis plan, and disruption-recovery tools. Stored only in this browser.</p>
    <Button onClick={() => update({ ...defaultLifeSupportState(), enabled: true })}>Enable support tools</Button>
  </section>

  return <section className="border rounded-xl p-5 space-y-6">
    <div>
      <h2 className="text-xl font-semibold">Personal support tools</h2>
      <p className="text-sm text-muted-foreground">You set the goal and constraints. NarcoGuard organizes them; it does not score or diagnose you.</p>
    </div>

    <div className="space-y-2">
      <label className="font-medium">My top priority right now</label>
      <input className="w-full border rounded p-2 bg-background" value={state.topGoal} onChange={(e) => update({ ...state, topGoal: e.target.value.slice(0, 200) })} placeholder="Keep my job, make an appointment, find housing…" />
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const value=constraint.trim(); if (!value) return; update({ ...state, constraints:[...state.constraints, value.slice(0,120)] }); setConstraint("") }}>
        <input aria-label="Personal constraint" className="flex-1 border rounded p-2 bg-background" value={constraint} onChange={(e)=>setConstraint(e.target.value)} placeholder="Constraint: no car, under $10, wheelchair access…" />
        <Button type="submit">Add</Button>
      </form>
      <div className="flex flex-wrap gap-2">{state.constraints.map((item, index)=><button key={item+index} className="border rounded px-2 py-1 text-sm" onClick={()=>update({ ...state, constraints:state.constraints.filter((_,i)=>i!==index) })}>{item} ×</button>)}</div>
    </div>

    <div className="space-y-2">
      <h3 className="font-semibold">Care continuity</h3>
      <form className="flex gap-2" onSubmit={(e)=>{e.preventDefault(); const value=task.trim(); if(!value)return; update({...state,careTasks:[...state.careTasks,{id:crypto.randomUUID(),title:value.slice(0,160),done:false}]}); setTask("")}}>
        <input aria-label="Care or life task" className="flex-1 border rounded p-2 bg-background" value={task} onChange={(e)=>setTask(e.target.value)} placeholder="Refill, appointment, call caseworker, follow-up…" />
        <Button type="submit">Add</Button>
      </form>
      {state.careTasks.map((item)=><label key={item.id} className="flex gap-2 items-center border rounded p-2"><input type="checkbox" checked={item.done} onChange={()=>update({...state,careTasks:state.careTasks.map((row)=>row.id===item.id?{...row,done:!row.done}:row)})}/><span className={item.done?"line-through":""}>{item.title}</span><button className="underline ml-auto" onClick={()=>update({...state,careTasks:state.careTasks.filter((row)=>row.id!==item.id)})}>Remove</button></label>)}
    </div>

    <div className="space-y-2">
      <h3 className="font-semibold">Transportation backup chain</h3>
      {(["primary","backup","fallback"] as const).map((key)=><label key={key} className="block capitalize">{key}<input className="block w-full border rounded p-2 bg-background" value={state.transport[key]} onChange={(e)=>update({...state,transport:{...state.transport,[key]:e.target.value.slice(0,200)}})} placeholder={key==="primary"?"Bus route / ride / walk":"Backup option"} /></label>)}
    </div>

    <div className="space-y-2">
      <h3 className="font-semibold">Document checklist</h3>
      <form className="flex gap-2" onSubmit={(e)=>{e.preventDefault(); const value=doc.trim(); if(!value)return; update({...state,documents:[...state.documents,{id:crypto.randomUUID(),name:value.slice(0,120),have:false}]}); setDoc("")}}>
        <input aria-label="Document" className="flex-1 border rounded p-2 bg-background" value={doc} onChange={(e)=>setDoc(e.target.value)} placeholder="Photo ID, birth certificate, insurance card…" />
        <Button type="submit">Add</Button>
      </form>
      {state.documents.map((item)=><label key={item.id} className="flex gap-2 items-center border rounded p-2"><input type="checkbox" checked={item.have} onChange={()=>update({...state,documents:state.documents.map((row)=>row.id===item.id?{...row,have:!row.have}:row)})}/><span>{item.name}</span><button className="underline ml-auto" onClick={()=>update({...state,documents:state.documents.filter((row)=>row.id!==item.id)})}>Remove</button></label>)}
    </div>

    <div className="space-y-2">
      <h3 className="font-semibold">My personal crisis plan</h3>
      <p className="text-xs text-muted-foreground">This is written by you and does not replace 911, 988, or professional care. NarcoGuard does not automatically contact anyone from this plan.</p>
      {([
        ["warningSigns","Things I notice when I need more support"],
        ["firstSteps","First steps that help me"],
        ["peopleToContact","People I choose to contact"],
        ["safePlaces","Places I consider safe"],
        ["reasonsToKeepGoing","Reasons / people / goals that matter to me"],
      ] as const).map(([key,label])=><label key={key} className="block">{label}<textarea className="block w-full min-h-20 border rounded p-2 bg-background" value={state.crisisPlan[key]} onChange={(e)=>update({...state,crisisPlan:{...state.crisisPlan,[key]:e.target.value.slice(0,1200)}})} /></label>)}
    </div>

    <div className="space-y-2">
      <label className="flex gap-2 items-center font-medium"><input type="checkbox" checked={state.disruptionMode} onChange={(e)=>update({...state,disruptionMode:e.target.checked})}/>Low-energy / disruption mode</label>
      {state.disruptionMode && <div className="rounded-lg border p-3"><p className="font-medium">Smallest useful plan</p><ol className="list-decimal pl-5">{resetSteps.map((step)=><li key={step}>{step}</li>)}</ol></div>}
    </div>

    <div className="pt-2 border-t">
      <Button variant="destructive" onClick={()=>{if(window.confirm("Erase all personal support-tool data from this browser?")){clearLifeSupportState(window.localStorage);setState(defaultLifeSupportState())}}}>Erase support-tool data</Button>
    </div>
  </section>
}
