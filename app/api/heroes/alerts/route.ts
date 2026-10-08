import { clientKey, isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { alertText, alertsStatus, prepareAvailability, prepareRequest, visibleRequests, type HeroAvailability, type HeroRequest } from "@/lib/hero-alerts"
import { getAuthContext, serviceRest } from "@/lib/supabase-auth"

// Nearby Hero requests. Every write is refused unless alertsStatus() is live, which needs the
// explicit HERO_ALERTS_ENABLED switch (only after a safety and privacy review) plus accounts and
// Hero certificates. Only coarse ~5 km cells are stored; nothing here is logged.

export const dynamic = "force-dynamic"

const recent = new Map<string, number[]>()
const limited = (key: string, max: number) => {
  const now = Date.now()
  const hits = (recent.get(key) ?? []).filter((at) => now - at < 10 * 60_000)
  hits.push(now)
  recent.set(key, hits)
  return hits.length > max
}

type AvailabilityRow = { auth_user_id: string; cell: string; available_until: string; paused: boolean }
type RequestRow = { id: string; cell: string; created_at: string; expires_at: string }
type CertificationRow = { expires_at: string; enrolled: boolean }

const toHero = (row: AvailabilityRow, certificateExpiresAt: number): HeroAvailability =>
  ({ heroId: row.auth_user_id, cell: row.cell, availableUntil: Date.parse(row.available_until), paused: row.paused, certificateExpiresAt })
const toRequest = (row: RequestRow): HeroRequest =>
  ({ id: row.id, cell: row.cell, createdAt: Date.parse(row.created_at), expiresAt: Date.parse(row.expires_at), called911: true })

async function enrolledCertificate(userId: string) {
  const response = await serviceRest(`hero_certifications?select=expires_at,enrolled&auth_user_id=eq.${encodeURIComponent(userId)}`)
  if (!response.ok) return null
  const [row] = (await response.json()) as CertificationRow[]
  const expires = row ? Date.parse(row.expires_at) : 0
  return row?.enrolled && expires > Date.now() ? expires : null
}

export async function GET() {
  const status = alertsStatus(process.env)
  if (!status.live) return json(status)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ ...status, requests: [] })
  const certificate = await enrolledCertificate(auth.user.id)
  if (!certificate) return json({ ...status, requests: [], note: "Only enrolled Heroes with a current certificate see requests." })
  const mine = await serviceRest(`hero_availability?select=auth_user_id,cell,available_until,paused&auth_user_id=eq.${encodeURIComponent(auth.user.id)}`)
  const [row] = mine.ok ? ((await mine.json()) as AvailabilityRow[]) : []
  if (!row) return json({ ...status, available: false, requests: [] })
  const hero = toHero(row, certificate)
  const open = await serviceRest(`hero_requests?select=id,cell,created_at,expires_at&expires_at=gt.${new Date().toISOString()}`)
  const requests = open.ok ? ((await open.json()) as RequestRow[]).map(toRequest) : []
  return json({
    ...status,
    available: !hero.paused && hero.availableUntil > Date.now(),
    availableUntil: hero.availableUntil,
    requests: visibleRequests(hero, requests).map((request) => ({ id: request.id, text: alertText(request) })),
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const status = alertsStatus(process.env)
  if (!status.live) return json({ error: status.reason, live: false }, 503)
  const body = await readJson(request)
  if (!body) return json({ error: "Invalid request" }, 400)

  if (body.action === "request") {
    if (limited(`req:${clientKey(request)}`, 3)) return json({ error: "A request was just sent. Stay on the line with 911." }, 429)
    const prepared = prepareRequest({ lat: body.lat, lon: body.lon, called911: body.called911 })
    if (!prepared.ok) return json({ error: prepared.error }, 400)
    const saved = await serviceRest("hero_requests", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ cell: prepared.request.cell, created_at: new Date(prepared.request.createdAt).toISOString(), expires_at: new Date(prepared.request.expiresAt).toISOString() }),
    }).catch(() => null)
    if (!saved?.ok) return json({ error: "The request could not be sent. Stay with 911; they are your fastest help." }, 503)
    return json({ sent: true, note: "Nearby Heroes who are available can see your request for 30 minutes. Keep following 911's instructions." })
  }

  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in as an enrolled Hero." }, 401)
  const certificate = await enrolledCertificate(auth.user.id)
  if (!certificate) return json({ error: "Enroll with a current Hero certificate first." }, 403)

  if (body.action === "available") {
    if (body.consent !== true) return json({ error: "Confirm that you agree to share your approximate area while available." }, 400)
    const availability = prepareAvailability({ heroId: auth.user.id, lat: body.lat, lon: body.lon, hours: body.hours, certificateExpiresAt: certificate })
    if (!availability) return json({ error: "Choose how long you are available (up to 8 hours) and allow your location." }, 400)
    const saved = await serviceRest("hero_availability?on_conflict=auth_user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ auth_user_id: auth.user.id, cell: availability.cell, available_until: new Date(availability.availableUntil).toISOString(), paused: false }),
    }).catch(() => null)
    return saved?.ok ? json({ available: true, availableUntil: availability.availableUntil }) : json({ error: "Could not save your availability." }, 503)
  }

  if (body.action === "pause" || body.action === "leave") {
    const path = `hero_availability?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`
    const saved = await (body.action === "pause"
      ? serviceRest(path, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ paused: true }) })
      : serviceRest(path, { method: "DELETE", headers: { Prefer: "return=minimal" } })).catch(() => null)
    return saved?.ok ? json({ available: false, removed: body.action === "leave" }) : json({ error: "Could not update your availability." }, 503)
  }

  return json({ error: "Unknown action" }, 400)
}
