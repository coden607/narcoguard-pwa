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
  return NextResponse.json({
    nearbyHeroes: [
      { id: "H1", lat: 42.0987, lon: -75.9180, distance: 0.3, name: "Hero Alpha" },
      { id: "H2", lat: 42.0970, lon: -75.9170, distance: 0.5, name: "Hero Beta" },
      { id: "H3", lat: 42.1001, lon: -75.9195, distance: 0.8, name: "Hero Gamma" },
    ],
    naloxoneLocations: [
      { name: "CVS Pharmacy - Binghamton", lat: 42.0980, lon: -75.9175, distance: 0.2 },
      { name: "Walgreens - Johnson City", lat: 42.1150, lon: -75.9560, distance: 2.1 },
      { name: "Lourdes Hospital Pharmacy", lat: 42.0890, lon: -75.9690, distance: 3.4 },
    ],
    hospitals: [
      { name: "UHS Wilson Medical Center", lat: 42.1150, lon: -75.9560, distance: 2.1 },
      { name: "Lourdes Hospital", lat: 42.0890, lon: -75.9690, distance: 3.4 },
      { name: "Binghamton General Hospital", lat: 42.1010, lon: -75.9110, distance: 0.9 },
    ],
  })
}
