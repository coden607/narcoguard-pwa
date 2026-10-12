import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { cellKey, cellOf, isHeroResourceKind } from "@/lib/hero-alerts"
import { isAllowedPushEndpoint, vapidConfigured } from "@/lib/hero-push"
import { getAuthContext, userRest } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

export async function GET() {
  return json({
    configured: vapidConfigured(process.env),
    publicKey: process.env.HERO_VAPID_PUBLIC_KEY ?? null,
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to save resource alerts." }, 401)
  const body = await readJson(request)
  if (!body) return json({ error: "Invalid request." }, 400)

  if (body.action === "unsubscribe") {
    if (!isAllowedPushEndpoint(body.endpoint)) return json({ error: "Invalid push subscription." }, 400)
    await Promise.all([
      userRest(auth.accessToken, `user_push_subscriptions?auth_user_id=eq.${encodeURIComponent(auth.user.id)}&endpoint=eq.${encodeURIComponent(body.endpoint)}`, {
        method: "DELETE", headers: { Prefer: "return=minimal" },
      }),
      userRest(auth.accessToken, `resource_watch_subscriptions?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`, {
        method: "DELETE", headers: { Prefer: "return=minimal" },
      }),
    ])
    return json({ subscribed: false })
  }

  if (body.action !== "subscribe") return json({ error: "Unknown action." }, 400)
  if (!vapidConfigured(process.env)) return json({ error: "Push notifications are not configured yet." }, 503)
  if (!isAllowedPushEndpoint(body.endpoint)) return json({ error: "Invalid push subscription." }, 400)
  if (!isHeroResourceKind(body.resourceKind)) return json({ error: "Choose a resource." }, 400)
  const cell = typeof body.lat === "number" && typeof body.lon === "number" ? cellOf(body.lat, body.lon) : null
  if (!cell) return json({ error: "Approximate location is required for nearby alerts." }, 400)

  const endpointResponse = await userRest(auth.accessToken, "user_push_subscriptions?on_conflict=endpoint", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      auth_user_id: auth.user.id,
      endpoint: body.endpoint,
      enabled: true,
      updated_at: new Date().toISOString(),
    }),
  })
  if (!endpointResponse.ok) return json({ error: "Could not save notification subscription." }, 503)

  const expiresAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString()
  const watchResponse = await userRest(auth.accessToken, "resource_watch_subscriptions?on_conflict=auth_user_id,cell,resource_kind", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      auth_user_id: auth.user.id,
      cell: cellKey(cell),
      resource_kind: body.resourceKind,
      expires_at: expiresAt,
      enabled: true,
      updated_at: new Date().toISOString(),
    }),
  })
  return watchResponse.ok
    ? json({ subscribed: true, expiresAt, note: "You will get a generic NarcoGuard notification if a nearby Hero opts in to offer this resource during the next 24 hours." })
    : json({ error: "Could not save the resource alert." }, 503)
}
