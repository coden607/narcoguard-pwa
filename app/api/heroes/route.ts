import { NextResponse } from "next/server"
// Hero enrollment remains disabled until authenticated account support is enabled.

export async function POST(request: Request) {
  await request.text()
  return NextResponse.json(
    { error: "Hero registration requires authenticated account support and is not enabled in this prototype." },
    { status: 501 },
  )
}
