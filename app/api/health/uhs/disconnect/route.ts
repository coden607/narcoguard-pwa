import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { clearUhsCookies } from "@/lib/health/uhs-oauth"

export async function POST() {
  // Expire the session and cancel any pending authorization attempt, all on their scoped path.
  clearUhsCookies(await cookies())
  return NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "private, no-store" } })
}
