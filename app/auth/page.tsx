"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AUTH_EMAIL_COOLDOWN_SECONDS, safeAuthDestination } from '@/lib/auth-recovery'

type AuthResponse = {
  success?: boolean
  error?: string
  code?: string
  confirmationRequired?: boolean
  message?: string
  retryAfter?: number
  next?: string
}

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login")
  const [destination, setDestination] = useState('/account')
  const [cooldown, setCooldown] = useState(0)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(true)
  const [google, setGoogle] = useState(false)
  const [confirmationRequired, setConfirmationRequired] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const error = params.get("error")
    const notice = error === "google"
      ? "Google sign-in did not finish. Try again, or use email below."
      : error === "email-confirmation"
        ? "Email confirmation did not finish. Enter your email below and request a new confirmation link."
      : error === "google-off"
        ? "Google sign-in is not switched on yet. Use email below."
        : params.get('reason') === 'expired' ? 'Your session has expired. Sign in to continue where you left off.' : ""
    let cancelled = false
    fetch("/api/auth", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: { google?: boolean }) => { if (!cancelled) setGoogle(data.google === true) })
      .catch(() => undefined)
      .finally(() => {
        if (cancelled) return
        setDestination(safeAuthDestination(params.get('next')))
        if (params.get('mode') === 'reset') setMode('reset')
        if (error === 'email-confirmation') setConfirmationRequired(true)
        if (notice) setMessage(notice)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener("online", update)
    window.addEventListener("offline", update)
    return () => {
      window.removeEventListener("online", update)
      window.removeEventListener("offline", update)
    }
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [cooldown])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!online) { setMessage("You are offline. Your details are still here; reconnect and try again."); return }
    setBusy(true)
    setMessage("")
    setConfirmationRequired(false)
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode === 'reset' ? 'reset-password' : mode,
          next: destination,
          email,
          password: mode === 'reset' ? undefined : password,
          displayName: mode === "signup" ? displayName : undefined,
        }),
      })
      const result = await response.json() as AuthResponse
      if (result.retryAfter) setCooldown(result.retryAfter)
      if (!response.ok) {
        if (result.code === "email_not_confirmed") setConfirmationRequired(true)
        throw new Error(result.error ?? "Unable to authenticate")
      }
      if (mode === 'reset') { setPassword(''); setMessage(result.message ?? 'If this address has an account, a reset email will arrive.'); return }
      if (result.confirmationRequired) {
        setConfirmationRequired(true)
        setMessage(result.message ?? "Check your email to confirm your account, then sign in.")
        return
      }
      setPassword('')
      router.replace(safeAuthDestination(result.next ?? destination))
      router.refresh()
    } catch (error) {
      setMessage(error instanceof TypeError ? "The sign-in service could not be reached. Check your connection and try again." : error instanceof Error ? error.message : "Unable to authenticate")
    } finally {
      setBusy(false)
    }
  }

  async function resendConfirmation() {
    if (!online) { setMessage("You are offline. Reconnect before requesting another confirmation email."); return }
    if (!email) {
      setMessage("Enter your email first.")
      return
    }
    setBusy(true)
    setMessage("")
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend-signup", email, next: destination }),
      })
      const result = await response.json() as AuthResponse
      setCooldown(result.retryAfter ?? AUTH_EMAIL_COOLDOWN_SECONDS)
      if (!response.ok) throw new Error(result.error ?? "Unable to resend confirmation")
      setConfirmationRequired(true)
      setMessage(result.message ?? "Confirmation email sent. Check your inbox and spam folder.")
    } catch (error) {
      setMessage(error instanceof TypeError ? "The confirmation service could not be reached. Check your connection and try again." : error instanceof Error ? error.message : "Unable to resend confirmation")
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen px-6 py-16 text-white">
      <div className="mx-auto max-w-md rounded-2xl border border-white/15 bg-black/30 p-8 shadow-2xl backdrop-blur-sm">
        <h1 className="mt-2 text-3xl font-bold">{mode === "login" ? "Sign in" : mode === 'reset' ? 'Reset your password' : "Create your account"}</h1>
        <p className="mt-2 text-sm text-white/70">
          Account access is protected by Supabase Auth. NarcoGuard emergency guidance and resources do not require an account.
        </p>

        {google && (
          <>
            <a href={`/api/auth/google?next=${encodeURIComponent(destination)}`} data-testid="google-sign-in" className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-white p-3 font-semibold text-slate-900">
              <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.8 6C12.4 13.7 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.2-13.5-9.9l-7.9 6C6.5 42.6 14.6 48 24 48z"/></svg>
              Continue with Google
            </a>
            <p className="mt-2 text-xs text-white/60">NarcoGuard never sees your Google password.</p>
            <p className="mt-6 text-center text-xs uppercase tracking-wide text-white/50">or use email</p>
          </>
        )}

        {!online && <p role="status" className="mt-4 rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">Offline. Reconnect to sign in, create an account, or request email links.</p>}

        <form onSubmit={submit} aria-busy={busy} className={google ? "mt-4 space-y-4" : "mt-8 space-y-4"}>
          {mode === "signup" && (
            <label className="block text-sm">
              Display name
              <input required autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" maxLength={80} />
            </label>
          )}
          <label className="block text-sm">
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" maxLength={254} />
          </label>
          {mode !== 'reset' && <label className="block text-sm">
            Password
            <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" minLength={8} maxLength={128} />
          </label>}
          <button disabled={!online || busy || (mode === 'reset' && cooldown > 0)} className="w-full rounded-lg bg-cyan-500 p-3 font-semibold text-slate-950 disabled:opacity-50">
            {busy ? "Working…" : mode === 'reset' ? 'Send reset link' : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {message && <p role="alert" aria-live="polite" className="mt-4 text-sm text-amber-200">{message}</p>}

        {confirmationRequired && (
          <button type="button" disabled={!online || busy || cooldown > 0} onClick={resendConfirmation} className="mt-3 text-sm text-cyan-300 underline disabled:opacity-50">
            Resend confirmation email
          </button>
        )}
        {confirmationRequired && <p className="mt-2 text-sm text-white/70">Wrong address? Edit Email above, then resend. This does not change an existing account.</p>}
        {cooldown > 0 && <p role="status" className="mt-2 text-sm">You can request another email in {cooldown} seconds.</p>}
        {mode === 'login' && <button type="button" onClick={() => { setMode('reset'); setPassword(''); setMessage(''); setConfirmationRequired(false) }} className="mt-4 block text-sm text-cyan-300 underline">Forgot password?</button>}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login")
            setPassword('')
            setMessage("")
            setConfirmationRequired(false)
          }}
          className="mt-6 block text-sm text-cyan-300 underline"
        >
          {mode === "login" ? "Create an account" : "I already have an account"}
        </button>
      </div>
    </main>
  )
}
