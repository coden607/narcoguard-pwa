"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { MessageCircle, Shield, UserPlus, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

type Profile = { auth_user_id: string; handle: string; display_name: string; bio: string; created_at: string }
type Post = { id: string; author_id: string; body: string; category: string; created_at: string }
type Connection = { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted"; created_at: string }
type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null }
type CommunityData = {
  authenticated: boolean
  userId?: string
  profile: Profile | null
  profiles: Profile[]
  posts: Post[]
  connections: Connection[]
  messages: Message[]
}

const empty: CommunityData = { authenticated: false, profile: null, profiles: [], posts: [], connections: [], messages: [] }

export default function CommunityPage() {
  const [data, setData] = useState<CommunityData>(empty)
  const [handle, setHandle] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [postBody, setPostBody] = useState("")
  const [category, setCategory] = useState("general")
  const [connectHandle, setConnectHandle] = useState("")
  const [messageTo, setMessageTo] = useState("")
  const [messageBody, setMessageBody] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    const response = await fetch("/api/community", { cache: "no-store" })
    const body = await response.json() as CommunityData
    setData(body)
    if (body.profile) {
      setHandle(body.profile.handle)
      setDisplayName(body.profile.display_name)
      setBio(body.profile.bio)
    }
  }, [])

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0)
    const timer = window.setInterval(() => void refresh(), 20_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(timer)
    }
  }, [refresh])

  const act = async (payload: Record<string, unknown>) => {
    setBusy(true)
    setNote("")
    try {
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const body = await response.json() as { error?: string }
      if (!response.ok) throw new Error(body.error ?? "Could not update the community.")
      await refresh()
      return true
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not update the community.")
      return false
    } finally {
      setBusy(false)
    }
  }

  const profileById = useMemo(() => new Map(data.profiles.map((profile) => [profile.auth_user_id, profile])), [data.profiles])
  const accepted = data.connections.filter((connection) => connection.status === "accepted")
  const pendingForMe = data.connections.filter((connection) => connection.status === "pending" && connection.addressee_id === data.userId)
  const connectedUserIds = accepted.map((connection) => connection.requester_id === data.userId ? connection.addressee_id : connection.requester_id)

  if (!data.authenticated) return <main className="mx-auto max-w-3xl p-4 sm:p-8 space-y-5">
    <h1 className="text-3xl font-bold">NarcoGuard Community</h1>
    <p className="text-muted-foreground">Connect with other NarcoGuard users without making emergency requests, exact location, or health information public.</p>
    <Button asChild><Link href="/auth">Sign in to join</Link></Button>
  </main>

  return <main className="mx-auto max-w-6xl p-4 sm:p-8 space-y-6">
    <header className="space-y-2">
      <div className="flex items-center gap-2"><Users className="h-7 w-7 text-primary" /><h1 className="text-3xl font-bold">NarcoGuard Community</h1></div>
      <p className="text-muted-foreground">A consent-first community for support, local resources, recovery wins, questions, and connection. Emergency Hero requests stay separate and private.</p>
    </header>

    <section className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-xl border p-5 space-y-3">
        <h2 className="text-xl font-semibold">My community profile</h2>
        <label className="block text-sm">Handle
          <input className="mt-1 w-full border rounded p-2" maxLength={24} value={handle} onChange={(event)=>setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} placeholder="your_handle" />
        </label>
        <label className="block text-sm">Display name
          <input className="mt-1 w-full border rounded p-2" maxLength={60} value={displayName} onChange={(event)=>setDisplayName(event.target.value)} />
        </label>
        <label className="block text-sm">Bio
          <textarea className="mt-1 w-full border rounded p-2 min-h-24" maxLength={500} value={bio} onChange={(event)=>setBio(event.target.value)} placeholder="Share only what you want other signed-in users to know." />
        </label>
        <Button disabled={busy} onClick={() => void act({ action:"profile", handle, displayName, bio })}>{data.profile ? "Save profile" : "Create profile"}</Button>
      </div>

      <div className="rounded-xl border p-5 space-y-3 lg:col-span-2">
        <h2 className="text-xl font-semibold">Post to the community</h2>
        {!data.profile ? <p className="text-sm text-muted-foreground">Create a community profile before posting.</p> : <>
          <div className="flex flex-wrap gap-2">
            {["general","resource","recovery","wins","question"].map((value)=><button type="button" key={value} onClick={()=>setCategory(value)} className={`rounded-full border px-3 py-1 text-sm ${category===value ? "bg-primary text-primary-foreground" : ""}`}>{value}</button>)}
          </div>
          <textarea className="w-full min-h-28 border rounded p-3" maxLength={1000} value={postBody} onChange={(event)=>setPostBody(event.target.value)} placeholder="Share a resource, question, win, or general update. Avoid posting someone else's private health or location information." />
          <Button disabled={busy || !postBody.trim()} onClick={async()=>{ if(await act({action:"post", body:postBody, category})) setPostBody("") }}>Post</Button>
        </>}
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1.4fr_.8fr]">
      <div className="rounded-xl border p-5 space-y-4">
        <h2 className="text-xl font-semibold">Community feed</h2>
        {data.posts.length === 0 ? <p className="text-sm text-muted-foreground">No posts yet.</p> : data.posts.map((post)=>{
          const author=profileById.get(post.author_id)
          return <article key={post.id} className="rounded-lg border p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong>{author?.display_name ?? "Community member"} <span className="text-xs font-normal text-muted-foreground">@{author?.handle ?? "member"}</span></strong>
              <span className="rounded-full border px-2 py-0.5 text-xs">{post.category}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{post.body}</p>
            <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</p>
          </article>
        })}
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border p-5 space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2"><UserPlus className="h-5 w-5" />Connections</h2>
          <div className="flex gap-2">
            <input className="min-w-0 flex-1 border rounded p-2" value={connectHandle} onChange={(event)=>setConnectHandle(event.target.value)} placeholder="handle" />
            <Button size="sm" disabled={busy || !connectHandle.trim()} onClick={async()=>{ if(await act({action:"connect", handle:connectHandle})) setConnectHandle("") }}>Connect</Button>
          </div>
          {pendingForMe.map((connection)=>{
            const profile=profileById.get(connection.requester_id)
            return <div key={connection.id} className="rounded border p-3">
              <p className="text-sm"><strong>{profile?.display_name ?? "Member"}</strong> wants to connect.</p>
              <Button className="mt-2" size="sm" disabled={busy} onClick={()=>void act({action:"accept", connectionId:connection.id})}>Accept</Button>
            </div>
          })}
          {connectedUserIds.length === 0 ? <p className="text-sm text-muted-foreground">No accepted connections yet.</p> : connectedUserIds.map((id)=>{
            const profile=profileById.get(id)
            return <div key={id} className="rounded border p-3 text-sm">
              <strong>{profile?.display_name ?? "Member"}</strong>
              <span className="block text-xs text-muted-foreground">@{profile?.handle ?? "member"}</span>
            </div>
          })}
        </section>

        <section className="rounded-xl border p-5 space-y-3">
          <h2 className="text-xl font-semibold flex items-center gap-2"><MessageCircle className="h-5 w-5" />Direct messages</h2>
          <select className="w-full border rounded p-2" value={messageTo} onChange={(event)=>setMessageTo(event.target.value)}>
            <option value="">Choose a connection</option>
            {connectedUserIds.map((id)=>{
              const profile=profileById.get(id)
              return <option key={id} value={id}>{profile?.display_name ?? profile?.handle ?? "Member"}</option>
            })}
          </select>
          {messageTo && <div className="max-h-64 overflow-y-auto space-y-2 rounded border p-3">
            {data.messages.filter((message)=>[message.sender_id,message.recipient_id].includes(messageTo) && [message.sender_id,message.recipient_id].includes(data.userId ?? "")).map((message)=>
              <div key={message.id} className={`max-w-[85%] rounded-lg p-2 text-sm ${message.sender_id===data.userId ? "ml-auto bg-primary/15" : "bg-muted"}`}>
                {message.body}
                <span className="mt-1 block text-[10px] text-muted-foreground">{new Date(message.created_at).toLocaleString()}</span>
              </div>
            )}
          </div>}
          <textarea className="w-full min-h-20 border rounded p-2" maxLength={2000} value={messageBody} onChange={(event)=>setMessageBody(event.target.value)} placeholder="Message an accepted connection" />
          <Button disabled={busy || !messageTo || !messageBody.trim()} onClick={async()=>{ if(await act({action:"message", recipientId:messageTo, body:messageBody})) setMessageBody("") }}>Send</Button>
        </section>
      </div>
    </section>

    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
      <div className="flex items-start gap-2"><Shield className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" /><p><strong>Privacy boundary:</strong> Community posts and messages are not emergency dispatch. Do not post someone else's exact location, medical information, or recovery status without permission. Use the Hero request flow and 911 for emergencies.</p></div>
    </section>
    {note && <p role="status" className="text-sm">{note}</p>}
  </main>
}
