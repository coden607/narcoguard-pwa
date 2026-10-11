import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { isAllowedPushEndpoint, vapidConfigured } from "@/lib/hero-push"
import { getAuthContext, heroServerRest } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

type CertificationRow = { expires_at: string; enrolled: boolean }

async function enrolledHero(userId: string) {
  const response = await heroServerRest(
    `hero_certifications?select=expires_at,enrolled&auth_user_id=eq.${encodeURIComponent(userId)}`,
  ).catch(() => null)
  if (!response?.ok) return false
  const [row] = (await response.json()) as CertificationRow[]
  return Boolean(row?.enrolled && Date.parse(row.expires_at) > Date.now())
}

export async function GET() {
  return json({
    configured: vapidConfigured(process.env),
    publicKey: process.env.HERO_VAPID_PUBLIC_KEY ?? null,
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!vapidConfigured(process.env)) return json({ error: "Hero push notifications are not configured yet." }, 503)

  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in as a Hero first." }, 401)
  if (!(await enrolledHero(auth.user.id))) return json({ error: "A current enrolled Hero certificate is required." }, 403)

  const body = await readJson(request)
  if (!body || !isAllowedPushEndpoint(body.endpoint)) return json({ error: "Invalid push subscription endpoint." }, 400)
  const endpoint = body.endpoint as string

  if (body.action === "subscribe") {
    const response = await heroServerRest("hero_push_subscriptions?on_conflict=endpoint", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        auth_user_id: auth.user.id,
        endpoint,
        enabled: true,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => null)
    return response?.ok
      ? json({ subscribed: true })
      : json({ error: "Could not save notification subscription." }, 503)
  }

  if (body.action === "unsubscribe") {
    const response = await heroServerRest(
      `hero_push_subscriptions?auth_user_id=eq.${encodeURIComponent(auth.user.id)}&endpoint=eq.${encodeURIComponent(endpoint)}`,
      { method: "DELETE", headers: { Prefer: "return=minimal" } },
    ).catch(() => null)
    return response?.ok
      ? json({ subscribed: false })
      : json({ error: "Could not remove notification subscription." }, 503)
  }

  return json({ error: "Unknown action." }, 400)
}
