import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { UHS_SESSION_COOKIE } from "@/lib/health/uhs-oauth"

export async function POST() {
  const store = await cookies()
  store.delete(UHS_SESSION_COOKIE)
  return NextResponse.json({ disconnected: true }, { headers: { "Cache-Control": "private, no-store" } })
}
