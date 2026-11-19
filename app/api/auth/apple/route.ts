import { NextResponse } from "next/server"
import { isAppleSignInEnabled } from "@/lib/supabase-auth"
import { publicAuthOrigin } from "@/lib/auth-origin"

export const dynamic = "force-dynamic"

/** Apple sign-in is optional and stays off until AUTH_APPLE_ENABLED and both credentials are set. */
export async function GET(request: Request) {
  const origin = publicAuthOrigin(request)
  return NextResponse.redirect(new URL(isAppleSignInEnabled() ? "/auth?error=apple-off" : "/auth?error=apple-off", origin))
}
