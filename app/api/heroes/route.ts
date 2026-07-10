import { NextResponse } from "next/server"
import { createUser, registerHero, logActivity } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const data = await request.json()

    const user = await createUser({
      email: data.email,
      displayName: data.name,
      phone: data.phone,
      role: "hero",
    })

    const certifications: string[] = Array.isArray(data.certifications) ? data.certifications : []
    const hero = await registerHero({
      userId: user.id,
      cprTrained: certifications.includes("cpr"),
      narcanTrained: certifications.includes("naloxone"),
      carriesNaloxone: Boolean(data.carriesNaloxone),
      responseRadiusMiles: data.responseRadiusMiles,
    })

    await logActivity({
      action: "hero_registered",
      details: { heroId: hero.id, name: data.name },
    })

    return NextResponse.json({ success: true, hero })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to register hero"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
