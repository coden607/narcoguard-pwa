import { NextResponse } from "next/server"

export const noStore = { "Cache-Control": "private, no-store" }

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore })

/** First hop of x-forwarded-for, used only as an in-memory rate-limit key and never logged. */
export const clientKey = (request: Request) => request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"

export const readJson = async (request: Request) => (await request.json().catch(() => null)) as Record<string, unknown> | null
