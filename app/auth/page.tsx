"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [google, setGoogle] = useState(false)

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error")
    const notice = error === "google" ? "Google sign-in did not finish. Try again, or use email below."
      : error === "google-off" ? "Google sign-in is not switched on yet. Use email below." : ""
    let cancelled = false
    fetch("/api/auth", { cache: "no-store" }).then((r) => r.json()).then((data: { google?: boolean }) => { if (!cancelled) setGoogle(data.google === true) })
      .catch(() => undefined).finally(() => { if (!cancelled && notice) setMessage(notice) })
    return () => { cancelled = true }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: mode, email, password, displayName: mode === "signup" ? displayName : undefined }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error ?? "Unable to authenticate")
      // Re-render server components so they see the new session cookie, then show the account.
      router.replace("/account")
      router.refresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to authenticate")
    } finally {
      setBusy(false)
    }
  }

  return <main className="min-h-screen px-6 py-16 text-white"><div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-black/30 p-8 shadow-2xl backdrop-blur-sm"><h1 className="mt-2 text-3xl font-bold">{mode === "login" ? "Sign in" : "Create your account"}</h1><p className="mt-2 text-sm text-white/70">Account access is protected by Supabase Auth. NarcoGuard is not a substitute for 911 or professional medical care.</p>{google && <><a href="/api/auth/google" data-testid="google-sign-in" className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-white p-3 font-semibold text-slate-900"><svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6C6.5 42.6 14.6 48 24 48z"/></svg>Continue with Google</a><p className="mt-2 text-xs text-white/60">Your name and email come from Google, so there is nothing to type. NarcoGuard never sees your Google password.</p><p className="mt-6 text-center text-xs uppercase tracking-wide text-white/50">or use email</p></>}<form onSubmit={submit} className={google ? "mt-4 space-y-4" : "mt-8 space-y-4"}>{mode === "signup" && <label className="block text-sm">Display name<input required autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" maxLength={80} /></label>}<label className="block text-sm">Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" maxLength={254} /></label><label className="block text-sm">Password<input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" minLength={8} maxLength={128} /></label><button disabled={busy} className="w-full rounded-lg bg-cyan-500 p-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? "Working…" : mode === "login" ? "Sign in" : "Create account"}</button></form>{message && <p role="alert" className="mt-4 text-sm text-amber-200">{message}</p>}<button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setMessage("") }} className="mt-6 text-sm text-cyan-300 underline">{mode === "login" ? "Create an account" : "I already have an account"}</button></div></main>
}
