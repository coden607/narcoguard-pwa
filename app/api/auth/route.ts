import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { z } from "zod"
import { clearSession, ensureProfile, getSession, isAuthConfigured, isGoogleSignInEnabled, resendSignup, requestPasswordReset, signIn, signUp, storeSession, type AuthFailure } from "@/lib/supabase-auth"
import { AUTH_EMAIL_COOLDOWN_SECONDS, RECOVERY_MAX_AGE_SECONDS, RECOVERY_VERIFIER_COOKIE, recoveryNotice, safeAuthDestination } from "@/lib/auth-recovery"
import { PKCE_COOKIE, challengeFor, createVerifier } from "@/lib/oauth-pkce"

const schema = z.object({
  action: z.enum(["login", "signup", "logout", "resend-signup", "reset-password"]),
  next: z.string().max(1000).optional(),
  email: z.string().trim().pipe(z.email().max(254)).optional(),
  password: z.string().min(8).max(128).optional(),
  displayName: z.string().trim().min(1).max(80).optional(),
})

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  if (!origin) return true
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  if (!isAuthConfigured()) return NextResponse.json({ available: false, authenticated: false, user: null }, { headers: { "Cache-Control": "private, no-store" } })
  try {
    const store = await cookies()
    const hadSession = Boolean(store.get('ng_access_token')?.value || store.get('ng_refresh_token')?.value)
    const user = await getSession()
    const next = safeAuthDestination(new URL(request.url).searchParams.get('next'))
    return NextResponse.json({ available: true, google: isGoogleSignInEnabled(), authenticated: Boolean(user), sessionExpired: hadSession && !user, recoveryUrl: `/auth?reason=expired&next=${encodeURIComponent(next)}`, user: user ? { id: user.id, email: user.email } : null }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json({ error: "Authentication service is unavailable" }, { status: 503 })
  }
}

function authErrorResponse(error: AuthFailure | null) {
  const code = error?.code ?? ""
  const message = (error?.message ?? "").toLowerCase()

  if (code === "email_address_invalid" || code === "email_address_not_authorized") {
    return NextResponse.json({ error: "Check your email address for typos, including the part after @.", code }, { status: 400 })
  }

  if (code === "email_not_confirmed" || message.includes("email not confirmed")) {
    return NextResponse.json({ error: "Confirm your email before signing in.", code: "email_not_confirmed" }, { status: 403 })
  }
  if (code === "invalid_credentials" || message.includes("invalid login credentials")) {
    return NextResponse.json({ error: "Email or password is incorrect.", code: "invalid_credentials" }, { status: 401 })
  }
  if (code === "user_already_exists" || message.includes("already registered") || message.includes("already exists")) {
    return NextResponse.json({ error: "An account already exists for that email. Sign in instead.", code: "user_already_exists" }, { status: 409 })
  }
  if (code === "weak_password" || message.includes("password")) {
    return NextResponse.json({ error: error?.message || "Choose a stronger password.", code: code || "weak_password" }, { status: 400 })
  }
  if (error?.status === 429) {
    return NextResponse.json({ error: "Too many attempts. Try again shortly.", code: code || "rate_limited" }, { status: 429 })
  }

  return NextResponse.json({ error: "Authentication failed. Please try again.", code: code || "auth_failed" }, { status: error?.status && error.status >= 400 && error.status < 500 ? error.status : 503 })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 })
  if (!isAuthConfigured()) return NextResponse.json({ error: "Accounts are not switched on yet. Everything else works without one." }, { status: 503 })
  try {
    const input = schema.parse(await request.json())
    if (input.action === "logout") {
      await clearSession()
      return NextResponse.json({ success: true })
    }

    if (input.action === "resend-signup" || input.action === "reset-password") {
      if (!input.email) return NextResponse.json({ error: "Email is required" }, { status: 400 })
      const store = await cookies()
      const cooldownName = 'ng_auth_email_cooldown'
      const until = Number(store.get(cooldownName)?.value ?? 0)
      if (until > Date.now()) return NextResponse.json({ error: 'Please wait before requesting another email.', retryAfter: Math.ceil((until - Date.now()) / 1000) }, { status: 429, headers: { 'Retry-After': String(Math.ceil((until - Date.now()) / 1000)), 'Cache-Control': 'private, no-store' } })
      store.set(cooldownName, String(Date.now() + AUTH_EMAIL_COOLDOWN_SECONDS * 1000), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: AUTH_EMAIL_COOLDOWN_SECONDS })
      if (input.action === 'reset-password') {
        const verifier = createVerifier()
        store.set(RECOVERY_VERIFIER_COOKIE, verifier, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: RECOVERY_MAX_AGE_SECONDS })
        await requestPasswordReset(input.email, `${new URL(request.url).origin}/api/auth/recovery`, await challengeFor(verifier))
      } else {
        const verifier = createVerifier()
        const next = safeAuthDestination(input.next)
        store.set(PKCE_COOKIE, verifier, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 3600 })
        store.set('ng_auth_next', next, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: 3600 })
        await resendSignup(input.email, `${new URL(request.url).origin}/api/auth/callback`, await challengeFor(verifier))
      }
      // Provider responses can reveal account state. Keep all accepted addresses indistinguishable.
      return NextResponse.json({ success: true, confirmationRequired: input.action === 'resend-signup', retryAfter: AUTH_EMAIL_COOLDOWN_SECONDS, message: recoveryNotice(input.action) }, { headers: { 'Cache-Control': 'private, no-store' } })
    }

    if (!input.email || !input.password || (input.action === "signup" && !input.displayName)) {
      return NextResponse.json({ error: "Email, password, and display name are required" }, { status: 400 })
    }

    const displayName = input.displayName
    let signupVerifier: string | undefined
    let attempt: Awaited<ReturnType<typeof signIn>>
    if (input.action === "signup") {
      signupVerifier = createVerifier()
      const store = await cookies()
      const next = safeAuthDestination(input.next)
      store.set(PKCE_COOKIE, signupVerifier, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth", maxAge: 3600 })
      store.set("ng_auth_next", next, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/auth", maxAge: 3600 })
      attempt = await signUp(input.email, input.password, displayName as string, `${new URL(request.url).origin}/api/auth/callback`, await challengeFor(signupVerifier))
    } else {
      attempt = await signIn(input.email, input.password)
    }

    if (attempt.error) {
      if (input.action === 'signup' && (attempt.error.code === 'user_already_exists' || /already (?:registered|exists)/i.test(attempt.error.message))) return NextResponse.json({ success: true, confirmationRequired: true, message: recoveryNotice('resend-signup') }, { status: 202 })
      return authErrorResponse(attempt.error)
    }

    if (input.action === "signup" && !attempt.session && attempt.user) {
      return NextResponse.json({
        success: true,
        confirmationRequired: true,
        message: recoveryNotice('resend-signup'),
      }, { status: 202 })
    }

    const session = attempt.session
    if (!session?.access_token || !session.refresh_token) return authErrorResponse(null)

    await storeSession(session)
    if (input.action === "signup") {
      const store = await cookies()
      store.delete({ name: PKCE_COOKIE, path: "/api/auth" })
      store.delete({ name: "ng_auth_next", path: "/api/auth" })
    }
    await ensureProfile(session, displayName ?? session.user?.email?.split("@")[0] ?? "NarcoGuard user")
    return NextResponse.json({ success: true, confirmationRequired: false, next: safeAuthDestination(input.next), user: session.user ? { id: session.user.id, email: session.user.email } : null })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid account details" }, { status: 400 })
    return NextResponse.json({ error: "Authentication service is unavailable" }, { status: 503 })
  }
}
