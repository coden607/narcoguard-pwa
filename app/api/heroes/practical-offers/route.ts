import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import {
  preparePracticalHelpOffer,
  type PracticalHelpKind,
} from "@/lib/hero-practical-offers"
import { getAuthContext, heroServerRest, isHeroServerConfigured } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

type OfferRow = {
  auth_user_id: string
  cell: string
  resource_kinds: PracticalHelpKind[]
  available_until: string
  updated_at: string
}

const networkReady = () =>
  process.env.HERO_ALERTS_ENABLED === "true" && isHeroServerConfigured()

async function currentOffer(userId: string) {
  const response = await heroServerRest(
    `hero_practical_offers?select=auth_user_id,cell,resource_kinds,available_until,updated_at&auth_user_id=eq.${encodeURIComponent(userId)}`,
  ).catch(() => null)
  if (!response?.ok) return null
  const [row] = (await response.json()) as OfferRow[]
  return row ?? null
}

export async function GET() {
  if (!networkReady()) return json({
    live: false,
    reason: "Practical-help offers are not live in this environment yet.",
  })

  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ live: true, authenticated: false, offer: null })

  const row = await currentOffer(auth.user.id)
  if (!row) return json({ live: true, authenticated: true, offer: null })

  const expiresAt = Date.parse(row.available_until)
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    await heroServerRest(
      `hero_practical_offers?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    ).catch(() => null)
    return json({ live: true, authenticated: true, offer: null })
  }

  return json({
    live: true,
    authenticated: true,
    offer: {
      availableUntil: expiresAt,
      resources: row.resource_kinds,
    },
    note: "Practical-help offers are separate from emergency Hero certification.",
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!networkReady()) return json({ error: "Practical-help offers are not live yet." }, 503)

  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to publish a practical-help offer." }, 401)

  const body = await readJson(request)
  if (!body) return json({ error: "Invalid request" }, 400)

  if (body.action === "remove") {
    const response = await heroServerRest(
      `hero_practical_offers?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    ).catch(() => null)
    return response?.ok
      ? json({ removed: true, note: "Practical-help offer removed." })
      : json({ error: "Could not remove the practical-help offer." }, 503)
  }

  if (body.action !== "publish") return json({ error: "Unknown action" }, 400)
  if (body.consent !== true) return json({
    error: "Confirm that you agree to share an approximate area while this offer is active.",
  }, 400)

  const offer = preparePracticalHelpOffer({
    helperId: auth.user.id,
    lat: body.lat,
    lon: body.lon,
    hours: body.hours,
    resources: body.resources,
  })
  if (!offer) return json({
    error: "Choose at least one practical-help category, a valid duration, and allow approximate location.",
  }, 400)

  const now = new Date().toISOString()
  const response = await heroServerRest("hero_practical_offers?on_conflict=auth_user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      auth_user_id: auth.user.id,
      cell: offer.cell,
      resource_kinds: offer.resources,
      available_until: new Date(offer.availableUntil).toISOString(),
      updated_at: now,
    }),
  }).catch(() => null)

  if (!response?.ok) return json({ error: "Could not publish the practical-help offer." }, 503)

  return json({
    published: true,
    availableUntil: offer.availableUntil,
    resources: offer.resources,
    note: "Published as practical help only. This does not enroll or certify you as an emergency Hero.",
  })
}
