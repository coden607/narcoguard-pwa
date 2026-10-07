import { NextResponse } from "next/server"
import { getDashboardStats, getDonationStats } from "@/lib/db"
import { FUNDING_GOAL, PROTOTYPE_UNITS, PROTOTYPE_UNIT_COST } from "@/lib/funding-goal"

export async function GET() {
  try {
    const [dashboard, donations] = await Promise.all([
      getDashboardStats(),
      getDonationStats(),
    ])

    return NextResponse.json({
      ...dashboard,
      donations: {
        total: Number(donations.total_raised || 0),
        count: Number(donations.total_donations || 0),
        average: Number(donations.avg_donation || 0),
      },
      goal: FUNDING_GOAL,
      prototypeUnits: PROTOTYPE_UNITS,
      costPerPrototype: PROTOTYPE_UNIT_COST,
    })
  } catch {
    return NextResponse.json(
      { available: false, message: "Dashboard statistics are unavailable until a verified database provider is configured." },
      { status: 503 },
    )
  }
}
