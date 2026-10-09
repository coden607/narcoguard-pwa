import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { PKCE_COOKIE, nameFromMetadata } from "@/lib/oauth-pkce"
import { ensureProfile, exchangeCode, isGoogleSignInEnabled, storeSession } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

/** Google sends the person back here; the code is exchanged with this browser's verifier and the session stored. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const fail = () => NextResponse.redirect(new URL("/auth?error=google", url.origin))
  const store = await cookies()
  const verifier = store.get(PKCE_COOKIE)?.value
  store.delete({ name: PKCE_COOKIE, path: "/api/auth" })
  const code = url.searchParams.get("code")
  if (!isGoogleSignInEnabled() || !code || !verifier) return fail()
  try {
    const session = await exchangeCode(code, verifier)
    if (!session?.access_token || !session.refresh_token) return fail()
    await storeSession(session)
    await ensureProfile(session, nameFromMetadata(session.user?.user_metadata, session.user?.email))
    return NextResponse.redirect(new URL("/account", url.origin))
  } catch {
    return fail()
  }
}
