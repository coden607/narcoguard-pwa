import { isSameOrigin, json, readJson, clientKey } from "@/lib/api-helpers"
import { getAuthContext, isAuthConfigured, userRest } from "@/lib/supabase-auth"
import { CARD_TYPE, validateEnvelope, type CardEnvelope } from "@/lib/emergency-card"

export const dynamic = "force-dynamic"

const inFlight = new Map<string, number>()

function limited(key: string): boolean {
  const count = (inFlight.get(key) ?? 0) + 1
  inFlight.set(key, count)
  setTimeout(() => inFlight.delete(key), 60_000).unref?.()
  return count > 6
}

async function context() {
  if (!isAuthConfigured()) return { error: json({ error: "Accounts are not switched on yet.", available: false }, 503) }
  try {
    const auth = await getAuthContext()
    return auth ? { auth } : { error: json({ error: "Sign in to manage your emergency card." }, 401) }
  } catch {
    return { error: json({ error: "The emergency card service is unavailable." }, 503) }
  }
}

/** Fetch the caller's sealed card envelope. Contents stay ciphertext end to end. */
export async function GET() {
  const { auth, error } = await context()
  if (!auth) return error
  const response = await userRest(
    auth.accessToken,
    `emergency_cards?select=sealed,updated_at&user_id=eq.${encodeURIComponent(auth.user.id)}&limit=1`,
  )
  if (!response.ok) return json({ error: "The emergency card is unavailable." }, 503)
  const rows = (await response.json().catch(() => [])) as { sealed: unknown; updated_at: string }[]
  const envelope = rows[0] ? validateEnvelope(rows[0].sealed) : null
  return json({ card: envelope ? { ...envelope, updatedAt: rows[0].updated_at } : null })
}

/** Store a sealed card envelope. The server validates only the envelope shape. */
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (limited(clientKey(request))) return json({ error: "Too many saves. Try again in a minute." }, 429)
  const { auth, error } = await context()
  if (!auth) return error
  const body = await readJson(request)
  const envelope = body ? validateEnvelope(body.card ?? body) : null
  if (!envelope) return json({ error: `Provide a sealed ${CARD_TYPE} envelope.` }, 400)
  const response = await userRest(auth.accessToken, "emergency_cards?on_conflict=user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: auth.user.id, sealed: envelope }),
  })
  if (!response.ok) return json({ error: "The emergency card could not be saved." }, 503)
  return json({ saved: true })
}

export async function DELETE() {
  const { auth, error } = await context()
  if (!auth) return error
  const response = await userRest(
    auth.accessToken,
    `emergency_cards?user_id=eq.${encodeURIComponent(auth.user.id)}`,
    { method: "DELETE", headers: { Prefer: "return=minimal" } },
  )
  if (!response.ok) return json({ error: "The emergency card could not be deleted." }, 503)
  return json({ deleted: true })
}

export type { CardEnvelope }
