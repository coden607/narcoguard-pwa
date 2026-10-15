import { NextResponse } from "next/server"
import { z } from "zod"
import { clearSession, ensureProfile, getSession, isAuthConfigured, isGoogleSignInEnabled, resendSignup, signIn, signUp, storeSession, type AuthFailure } from "@/lib/supabase-auth"

const schema = z.object({
  action: z.enum(["login", "signup", "logout", "resend-signup"]),
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

export async function GET() {
  if (!isAuthConfigured()) return NextResponse.json({ available: false, authenticated: false, user: null }, { headers: { "Cache-Control": "private, no-store" } })
  try {
    const user = await getSession()
    return NextResponse.json({ available: true, google: isGoogleSignInEnabled(), authenticated: Boolean(user), user: user ? { id: user.id, email: user.email } : null })
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

    if (input.action === "resend-signup") {
      if (!input.email) return NextResponse.json({ error: "Email is required" }, { status: 400 })
      const error = await resendSignup(input.email)
      if (error) return authErrorResponse(error)
      return NextResponse.json({ success: true, confirmationRequired: true, message: "Confirmation email sent. Check your inbox and spam folder." })
    }

    if (!input.email || !input.password || (input.action === "signup" && !input.displayName)) {
      return NextResponse.json({ error: "Email, password, and display name are required" }, { status: 400 })
    }

    const displayName = input.displayName
    const attempt = input.action === "signup"
      ? await signUp(input.email, input.password, displayName as string)
      : await signIn(input.email, input.password)

    if (attempt.error) return authErrorResponse(attempt.error)

    if (input.action === "signup" && !attempt.session && attempt.user) {
      return NextResponse.json({
        success: true,
        confirmationRequired: true,
        message: "Account created. Check your email to confirm it, then sign in.",
      }, { status: 202 })
    }

    const session = attempt.session
    if (!session?.access_token || !session.refresh_token) return authErrorResponse(null)

    await storeSession(session)
    await ensureProfile(session, displayName ?? session.user?.email?.split("@")[0] ?? "NarcoGuard user")
    return NextResponse.json({ success: true, confirmationRequired: false, user: session.user ? { id: session.user.id, email: session.user.email } : null })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid account details" }, { status: 400 })
    return NextResponse.json({ error: "Authentication service is unavailable" }, { status: 503 })
  }
}
