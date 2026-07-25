import { NextResponse } from "next/server"
import { z } from "zod"

const locationSchema = z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180), accuracy: z.number().finite().nonnegative().max(100000).optional() })

export async function POST(request: Request) {
  try {
    locationSchema.parse(await request.json())

    return NextResponse.json({
      success: true,
      message: "Location updated",
      timestamp: Date.now(),
    })
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500
    return NextResponse.json({ error: status === 400 ? "Invalid location" : "Failed to update location" }, { status })
  }
}

export async function GET() {
  return NextResponse.json({ available: false, source: "unavailable", message: "No verified location-data provider is configured.", nearbyHeroes: [], naloxoneLocations: [], hospitals: [] }, { status: 503 })
}
