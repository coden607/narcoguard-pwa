import { NextResponse } from "next/server"
import { getActiveEmergencies } from "@/lib/db"

export async function POST(request: Request) {
  try {
    await request.json()

    return NextResponse.json({ available: false, dispatched: false, message: "No emergency-dispatch provider is configured. Call 911 for immediate help." }, { status: 503 })
  } catch {
    return NextResponse.json({ error: "Failed to process emergency" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const emergencies = await getActiveEmergencies()
    return NextResponse.json({ emergencies })
  } catch {
    return NextResponse.json({ emergencies: [] })
  }
}
