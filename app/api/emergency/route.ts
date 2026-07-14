import { NextResponse } from "next/server"
import { getActiveEmergencies } from "@/lib/db"

export async function POST(request: Request) {
  try {
    await request.json()

    const response = {
      success: true,
      demo: true,
      dispatched: false,
      message: "Emergency response demonstration completed; no alerts were sent.",
      actionsTriggered: [],
      estimatedResponseTime: null,
      nearestHeroes: [],
    }

    return NextResponse.json(response)
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
