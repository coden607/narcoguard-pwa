'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('Checking your reset link…')
  useEffect(() => {
    let active = true
    fetch('/api/auth/password', { cache: 'no-store' }).then(r => r.json()).then((data: { ready?: boolean }) => {
      if (!active) return
      setReady(data.ready === true)
      setMessage(data.ready ? '' : 'This reset link has expired or was already used. Request a new link in this browser.')
    }).catch(() => { if (active) setMessage('Unable to check the reset link. Please reload to try again.') })
    return () => { active = false }
  }, [])
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmation) { setMessage('Passwords do not match.'); return }
    setBusy(true)
    try {
      const response = await fetch('/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) })
      const result = await response.json() as { error?: string; code?: string }
      if (!response.ok) {
        if (result.code === 'expired') setReady(false)
        setMessage(result.error ?? 'Unable to change your password.')
        return
      }
      setPassword(''); setConfirmation(''); setReady(false); setDone(true)
      setMessage('Your password has been changed. Sign in with your new password.')
    } catch { setMessage('Unable to connect. Try again when you are online.') } finally { setBusy(false) }
  }
  return <main className="mx-auto min-h-screen max-w-md px-6 py-16 text-white">
    <h1 className="text-3xl font-bold">{done ? 'Password changed' : 'Reset your password'}</h1>
    {ready && <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block">New password<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" /></label>
      <label className="block">Confirm new password<input required type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 w-full rounded-lg bg-white/10 p-3" /></label>
      <button disabled={busy} className="w-full rounded-lg bg-cyan-500 p-3 font-semibold text-slate-950 disabled:opacity-50">{busy ? 'Working…' : 'Change password'}</button>
    </form>}
    {message && <p role="status" className="mt-4">{message}</p>}
    <Link className="mt-6 block text-cyan-300 underline" href={done ? '/auth' : '/auth?mode=reset'}>{done ? 'Sign in' : 'Request a new reset link'}</Link>
    <Link className="mt-4 block text-cyan-300 underline" href="/emergency">Emergency help without an account</Link>
  </main>
}
