import { createHash, randomBytes } from "node:crypto"
import { clientKey, isSameOrigin, json, readJson } from "@/lib/api-helpers"
import {
  alertText,
  alertsStatus,
  prepareAvailability,
  prepareRequest,
  prepareResourceRequest,
  visibleRequests,
  type HeroAvailability,
  type HeroRequest,
  type HeroResourceKind,
} from "@/lib/hero-alerts"
import { getAuthContext, serviceRest } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

const recent = new Map<string, number[]>()
const limited = (key: string, max: number) => {
  const now = Date.now()
  const hits = (recent.get(key) ?? []).filter((at) => now - at < 10 * 60_000)
  hits.push(now)
  recent.set(key, hits)
  return hits.length > max
}

const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex")
const newRequestToken = () => randomBytes(24).toString("base64url")

type AvailabilityRow = {
  auth_user_id: string
  cell: string
  available_until: string
  paused: boolean
  emergency_ready?: boolean
  naloxone_on_call?: boolean
  resource_kinds?: HeroResourceKind[]
}
type RequestRow = {
  id: string
  cell: string
  created_at: string
  expires_at: string
  kind?: "emergency" | "resource"
  resource_kind?: HeroResourceKind | null
  status?: "open" | "accepted" | "completed" | "cancelled"
  accepted_by?: string | null
  accepted_at?: string | null
  completed_at?: string | null
  request_token_hash?: string | null
}
type CertificationRow = { expires_at: string; enrolled: boolean }

const toHero = (row: AvailabilityRow, certificateExpiresAt: number): HeroAvailability => ({
  heroId: row.auth_user_id,
  cell: row.cell,
  availableUntil: Date.parse(row.available_until),
  paused: row.paused,
  certificateExpiresAt,
  emergencyReady: row.emergency_ready === true,
  naloxoneOnCall: row.naloxone_on_call === true,
  resources: Array.isArray(row.resource_kinds) ? row.resource_kinds : [],
})

const toRequest = (row: RequestRow): HeroRequest => ({
  id: row.id,
  cell: row.cell,
  createdAt: Date.parse(row.created_at),
  expiresAt: Date.parse(row.expires_at),
  kind: row.kind === "resource" ? "resource" : "emergency",
  called911: row.kind !== "resource",
  ...(row.resource_kind ? { resourceKind: row.resource_kind } : {}),
  status: row.status ?? "open",
})

async function enrolledCertificate(userId: string) {
  const response = await serviceRest(`hero_certifications?select=expires_at,enrolled&auth_user_id=eq.${encodeURIComponent(userId)}`)
  if (!response.ok) return null
  const [row] = (await response.json()) as CertificationRow[]
  const expires = row ? Date.parse(row.expires_at) : 0
  return row?.enrolled && expires > Date.now() ? expires : null
}

async function trackedRequest(requestId: string, token: string) {
  const hash = tokenHash(token)
  const response = await serviceRest(
    `hero_requests?select=id,status,expires_at,kind,resource_kind,accepted_at,completed_at&id=eq.${encodeURIComponent(requestId)}&request_token_hash=eq.${hash}`,
  ).catch(() => null)
  if (!response?.ok) return null
  const [row] = (await response.json()) as RequestRow[]
  return row ?? null
}

export async function GET(request: Request) {
  const status = alertsStatus(process.env)
  if (!status.live) return json(status)

  const url = new URL(request.url)
  const requestId = url.searchParams.get("requestId")
  const requestToken = url.searchParams.get("token")
  if (requestId && requestToken) {
    const row = await trackedRequest(requestId, requestToken)
    if (!row) return json({ error: "Request not found." }, 404)
    const expired = Date.parse(row.expires_at) <= Date.now() && row.status === "open"
    return json({
      live: true,
      request: {
        id: row.id,
        kind: row.kind ?? "emergency",
        resourceKind: row.resource_kind ?? null,
        status: expired ? "expired" : (row.status ?? "open"),
        accepted: row.status === "accepted" || row.status === "completed",
        completed: row.status === "completed",
      },
    })
  }

  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ ...status, authenticated: false, requests: [] })
  const certificate = await enrolledCertificate(auth.user.id)
  if (!certificate) return json({ ...status, authenticated: true, enrolled: false, requests: [], note: "Only enrolled Heroes with a current certificate see requests." })

  const mine = await serviceRest(
    `hero_availability?select=auth_user_id,cell,available_until,paused,emergency_ready,naloxone_on_call,resource_kinds&auth_user_id=eq.${encodeURIComponent(auth.user.id)}`,
  )
  const [row] = mine.ok ? ((await mine.json()) as AvailabilityRow[]) : []

  const acceptedResponse = await serviceRest(
    `hero_requests?select=id,cell,created_at,expires_at,kind,resource_kind,status,accepted_by,accepted_at,completed_at&accepted_by=eq.${encodeURIComponent(auth.user.id)}&status=eq.accepted&expires_at=gt.${new Date().toISOString()}`,
  ).catch(() => null)
  const acceptedRows = acceptedResponse?.ok ? ((await acceptedResponse.json()) as RequestRow[]) : []

  if (!row) {
    return json({
      ...status,
      authenticated: true,
      enrolled: true,
      available: false,
      requests: [],
      accepted: acceptedRows.map((item) => ({ id: item.id, kind: item.kind ?? "emergency", resourceKind: item.resource_kind ?? null, text: alertText(toRequest(item)) })),
    })
  }

  const hero = toHero(row, certificate)
  const open = await serviceRest(
    `hero_requests?select=id,cell,created_at,expires_at,kind,resource_kind,status&status=eq.open&expires_at=gt.${new Date().toISOString()}`,
  )
  const requests = open.ok ? ((await open.json()) as RequestRow[]).map(toRequest) : []

  return json({
    ...status,
    authenticated: true,
    enrolled: true,
    available: !hero.paused && hero.availableUntil > Date.now(),
    paused: hero.paused,
    availableUntil: hero.availableUntil,
    emergencyReady: hero.emergencyReady,
    naloxoneOnCall: hero.naloxoneOnCall,
    resources: hero.resources,
    requests: visibleRequests(hero, requests).map((item) => ({
      id: item.id,
      kind: item.kind,
      resourceKind: item.resourceKind ?? null,
      text: alertText(item),
    })),
    accepted: acceptedRows.map((item) => ({
      id: item.id,
      kind: item.kind ?? "emergency",
      resourceKind: item.resource_kind ?? null,
      text: alertText(toRequest(item)),
    })),
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const status = alertsStatus(process.env)
  if (!status.live) return json({ error: status.reason, live: false }, 503)
  const body = await readJson(request)
  if (!body) return json({ error: "Invalid request" }, 400)

  if (body.action === "request" || body.action === "resource-request") {
    if (limited(`req:${clientKey(request)}`, 4)) return json({ error: "A request was just sent. Please wait before sending another." }, 429)
    const prepared = body.action === "request"
      ? prepareRequest({ lat: body.lat, lon: body.lon, called911: body.called911 })
      : prepareResourceRequest({ lat: body.lat, lon: body.lon, resourceKind: body.resourceKind })
    if (!prepared.ok) return json({ error: prepared.error }, 400)

    const requestToken = newRequestToken()
    const saved = await serviceRest("hero_requests", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        cell: prepared.request.cell,
        created_at: new Date(prepared.request.createdAt).toISOString(),
        expires_at: new Date(prepared.request.expiresAt).toISOString(),
        kind: prepared.request.kind,
        resource_kind: prepared.request.resourceKind ?? null,
        status: "open",
        request_token_hash: tokenHash(requestToken),
      }),
    }).catch(() => null)
    if (!saved?.ok) return json({ error: prepared.request.kind === "emergency" ? "The request could not be sent. Stay with 911." : "The resource request could not be posted." }, 503)
    const [row] = (await saved.json()) as RequestRow[]
    return json({
      sent: true,
      requestId: row?.id,
      requestToken,
      expiresAt: prepared.request.expiresAt,
      note: prepared.request.kind === "emergency"
        ? "Nearby emergency-ready Heroes can see this request while it is open. Keep following 911's instructions."
        : "Nearby Heroes who listed that resource can see this request. NarcoGuard does not guarantee that a volunteer or item will be available.",
    })
  }

  if (body.action === "cancel") {
    if (typeof body.requestId !== "string" || typeof body.requestToken !== "string") return json({ error: "Request tracking information is missing." }, 400)
    const row = await trackedRequest(body.requestId, body.requestToken)
    if (!row) return json({ error: "Request not found." }, 404)
    if (row.status === "completed") return json({ error: "A completed request cannot be cancelled." }, 409)
    const saved = await serviceRest(
      `hero_requests?id=eq.${encodeURIComponent(body.requestId)}&request_token_hash=eq.${tokenHash(body.requestToken)}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "cancelled" }) },
    ).catch(() => null)
    return saved?.ok ? json({ cancelled: true }) : json({ error: "Could not cancel the request." }, 503)
  }

  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in as an enrolled Hero." }, 401)
  const certificate = await enrolledCertificate(auth.user.id)
  if (!certificate) return json({ error: "Enroll with a current Hero certificate first." }, 403)

  if (body.action === "available") {
    if (body.consent !== true) return json({ error: "Confirm that you agree to share your approximate area while available." }, 400)
    const availability = prepareAvailability({
      heroId: auth.user.id,
      lat: body.lat,
      lon: body.lon,
      hours: body.hours,
      certificateExpiresAt: certificate,
      emergencyReady: body.emergencyReady,
      naloxoneOnCall: body.naloxoneOnCall,
      resources: body.resources,
    })
    if (!availability) {
      return json({
        error: body.emergencyReady === true && body.naloxoneOnCall !== true
          ? "Emergency on-call mode requires confirming that you are carrying naloxone."
          : "Choose at least one resource or emergency responder mode, choose an availability time, and allow approximate location.",
      }, 400)
    }
    const saved = await serviceRest("hero_availability?on_conflict=auth_user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        auth_user_id: auth.user.id,
        cell: availability.cell,
        available_until: new Date(availability.availableUntil).toISOString(),
        paused: false,
        emergency_ready: availability.emergencyReady,
        naloxone_on_call: availability.naloxoneOnCall,
        resource_kinds: availability.resources,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => null)
    return saved?.ok
      ? json({ available: true, availableUntil: availability.availableUntil, emergencyReady: availability.emergencyReady, resources: availability.resources })
      : json({ error: "Could not save your availability." }, 503)
  }

  if (body.action === "accept") {
    if (typeof body.requestId !== "string") return json({ error: "Request ID is missing." }, 400)
    const mine = await serviceRest(
      `hero_availability?select=auth_user_id,cell,available_until,paused,emergency_ready,naloxone_on_call,resource_kinds&auth_user_id=eq.${encodeURIComponent(auth.user.id)}`,
    )
    const [availabilityRow] = mine.ok ? ((await mine.json()) as AvailabilityRow[]) : []
    if (!availabilityRow) return json({ error: "Go available before accepting requests." }, 409)
    const hero = toHero(availabilityRow, certificate)

    const wanted = await serviceRest(
      `hero_requests?select=id,cell,created_at,expires_at,kind,resource_kind,status&id=eq.${encodeURIComponent(body.requestId)}&status=eq.open`,
    )
    const [requestRow] = wanted.ok ? ((await wanted.json()) as RequestRow[]) : []
    if (!requestRow) return json({ error: "That request is no longer open." }, 409)
    const matching = visibleRequests(hero, [toRequest(requestRow)])
    if (matching.length !== 1) return json({ error: "That request is not currently a match for your availability." }, 403)

    const accepted = await serviceRest(
      `hero_requests?id=eq.${encodeURIComponent(body.requestId)}&status=eq.open`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "accepted", accepted_by: auth.user.id, accepted_at: new Date().toISOString() }),
      },
    ).catch(() => null)
    if (!accepted?.ok) return json({ error: "Could not accept the request." }, 503)
    const rows = (await accepted.json()) as RequestRow[]
    if (rows.length !== 1) return json({ error: "Another Hero already accepted that request." }, 409)
    return json({ accepted: true, requestId: body.requestId, note: "Accepted. No exact location or requester identity is shared automatically. Use safe, public handoff practices and call 911 for emergencies." })
  }

  if (body.action === "complete") {
    if (typeof body.requestId !== "string") return json({ error: "Request ID is missing." }, 400)
    const saved = await serviceRest(
      `hero_requests?id=eq.${encodeURIComponent(body.requestId)}&accepted_by=eq.${encodeURIComponent(auth.user.id)}&status=eq.accepted`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ status: "completed", completed_at: new Date().toISOString() }),
      },
    ).catch(() => null)
    if (!saved?.ok) return json({ error: "Could not complete the request." }, 503)
    const rows = (await saved.json()) as RequestRow[]
    return rows.length === 1 ? json({ completed: true }) : json({ error: "That request is not assigned to you." }, 403)
  }

  if (body.action === "pause" || body.action === "leave") {
    const path = `hero_availability?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`
    const saved = await (body.action === "pause"
      ? serviceRest(path, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ paused: true, updated_at: new Date().toISOString() }) })
      : serviceRest(path, { method: "DELETE", headers: { Prefer: "return=minimal" } })).catch(() => null)
    return saved?.ok ? json({ available: false, removed: body.action === "leave" }) : json({ error: "Could not update your availability." }, 503)
  }

  return json({ error: "Unknown action" }, 400)
}
