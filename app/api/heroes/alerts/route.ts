import { createHash, randomBytes } from "node:crypto"
import { clientKey, isSameOrigin, json, readJson } from "@/lib/api-helpers"
import {
  alertText,
  alertsStatus,
  matchHeroes,
  nearbyCells,
  parseCellKey,
  prepareAvailability,
  prepareRequest,
  prepareResourceRequest,
  visibleRequests,
  type HeroAvailability,
  type HeroRequest,
  type HeroResourceKind,
} from "@/lib/hero-alerts"
import { cleanMeetingNote, openHeroLocation, sealHeroLocation } from "@/lib/hero-location"
import { heroCanRelease, type HeroRequestStatus } from "@/lib/hero-lifecycle"
import { sendEmptyWebPush, vapidConfigured } from "@/lib/hero-push"
import { getAuthContext, heroServerRest } from "@/lib/supabase-auth"

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
  status?: HeroRequestStatus
  accepted_by?: string | null
  accepted_at?: string | null
  en_route_at?: string | null
  arrived_at?: string | null
  completed_at?: string | null
  request_token_hash?: string | null
  location_ciphertext?: string | null
  meeting_note?: string | null
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
  const response = await heroServerRest(`hero_certifications?select=expires_at,enrolled&auth_user_id=eq.${encodeURIComponent(userId)}`)
  if (!response.ok) return null
  const [row] = (await response.json()) as CertificationRow[]
  const expires = row ? Date.parse(row.expires_at) : 0
  return row?.enrolled && expires > Date.now() ? expires : null
}

async function cleanupOldRequests() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60_000).toISOString()
  await heroServerRest(`hero_requests?expires_at=lt.${cutoff}`, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  }).catch(() => null)
}

type PushSubscriptionRow = { id: string; auth_user_id: string; endpoint: string }
type ResourceWatchRow = { auth_user_id: string; resource_kind: HeroResourceKind }
type UserPushSubscriptionRow = { id: string; auth_user_id: string; endpoint: string }

async function notifyMatchingResourceWatchers(availability: HeroAvailability) {
  if (!vapidConfigured(process.env) || availability.resources.length === 0) return
  const origin = parseCellKey(availability.cell)
  if (!origin) return
  const cells = nearbyCells(origin).map((cell) => `"${cell}"`).join(",")
  const kinds = availability.resources.map((kind) => `"${kind}"`).join(",")
  const watchResponse = await heroServerRest(
    `resource_watch_subscriptions?select=auth_user_id,resource_kind&enabled=eq.true&expires_at=gt.${new Date().toISOString()}&cell=in.(${encodeURIComponent(cells)})&resource_kind=in.(${encodeURIComponent(kinds)})`,
  ).catch(() => null)
  if (!watchResponse?.ok) return
  const watches = (await watchResponse.json()) as ResourceWatchRow[]
  const userIds = [...new Set(watches.map((row) => row.auth_user_id))]
  if (userIds.length === 0) return

  const ids = userIds.map((id) => `"${id}"`).join(",")
  const subscriptionsResponse = await heroServerRest(
    `user_push_subscriptions?select=id,auth_user_id,endpoint&enabled=eq.true&auth_user_id=in.(${encodeURIComponent(ids)})`,
  ).catch(() => null)
  if (!subscriptionsResponse?.ok) return
  const subscriptions = (await subscriptionsResponse.json()) as UserPushSubscriptionRow[]

  await Promise.allSettled(subscriptions.map(async (subscription) => {
    const result = await sendEmptyWebPush(subscription.endpoint, process.env)
    if (result.status === 404 || result.status === 410) {
      await heroServerRest(
        `user_push_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
      ).catch(() => null)
    }
  }))
}

async function notifyMatchingHeroes(request: HeroRequest) {
  if (!vapidConfigured(process.env)) return
  const origin = parseCellKey(request.cell)
  if (!origin) return
  const cells = nearbyCells(origin).map((cell) => `"${cell}"`).join(",")
  const response = await heroServerRest(
    `hero_availability?select=auth_user_id,cell,available_until,paused,emergency_ready,naloxone_on_call,resource_kinds&paused=eq.false&available_until=gt.${new Date().toISOString()}&cell=in.(${encodeURIComponent(cells)})`,
  ).catch(() => null)
  if (!response?.ok) return

  const rows = (await response.json()) as AvailabilityRow[]
  const candidates = matchHeroes(
    request,
    rows.map((row) => toHero(row, Date.parse(row.available_until))),
  )
  if (candidates.length === 0) return

  const ids = candidates.map((hero) => `"${hero.heroId}"`).join(",")
  const subscriptionsResponse = await heroServerRest(
    `hero_push_subscriptions?select=id,auth_user_id,endpoint&enabled=eq.true&auth_user_id=in.(${encodeURIComponent(ids)})`,
  ).catch(() => null)
  if (!subscriptionsResponse?.ok) return
  const subscriptions = (await subscriptionsResponse.json()) as PushSubscriptionRow[]

  await Promise.allSettled(subscriptions.map(async (subscription) => {
    const result = await sendEmptyWebPush(subscription.endpoint, process.env)
    if (result.status === 404 || result.status === 410) {
      await heroServerRest(
        `hero_push_subscriptions?id=eq.${encodeURIComponent(subscription.id)}`,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
      ).catch(() => null)
    }
  }))
}

async function trackedRequest(requestId: string, token: string) {
  const hash = tokenHash(token)
  const response = await heroServerRest(
    `hero_requests?select=id,status,expires_at,kind,resource_kind,accepted_at,en_route_at,arrived_at,completed_at&id=eq.${encodeURIComponent(requestId)}&request_token_hash=eq.${hash}`,
  ).catch(() => null)
  if (!response?.ok) return null
  const [row] = (await response.json()) as RequestRow[]
  return row ?? null
}

export async function GET(request: Request) {
  const status = alertsStatus(process.env)
  if (!status.live) return json(status)
  await cleanupOldRequests()

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
        accepted: ["accepted", "en_route", "arrived", "completed"].includes(row.status ?? ""),
        completed: row.status === "completed",
      },
    })
  }

  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ ...status, authenticated: false, requests: [] })
  const certificate = await enrolledCertificate(auth.user.id)
  if (!certificate) return json({ ...status, authenticated: true, enrolled: false, requests: [], note: "Only enrolled Heroes with a current certificate see requests." })

  const mine = await heroServerRest(
    `hero_availability?select=auth_user_id,cell,available_until,paused,emergency_ready,naloxone_on_call,resource_kinds&auth_user_id=eq.${encodeURIComponent(auth.user.id)}`,
  )
  const [row] = mine.ok ? ((await mine.json()) as AvailabilityRow[]) : []

  const acceptedResponse = await heroServerRest(
    `hero_requests?select=id,cell,created_at,expires_at,kind,resource_kind,status,accepted_by,accepted_at,en_route_at,arrived_at,completed_at,location_ciphertext,meeting_note&accepted_by=eq.${encodeURIComponent(auth.user.id)}&status=in.(accepted,en_route,arrived)&expires_at=gt.${new Date().toISOString()}`,
  ).catch(() => null)
  const acceptedRows = acceptedResponse?.ok ? ((await acceptedResponse.json()) as RequestRow[]) : []

  if (!row) {
    return json({
      ...status,
      authenticated: true,
      enrolled: true,
      available: false,
      requests: [],
      accepted: acceptedRows.map((item) => ({
        id: item.id,
        kind: item.kind ?? "emergency",
        resourceKind: item.resource_kind ?? null,
        text: alertText(toRequest(item)),
        status: item.status ?? "accepted",
        meetingNote: item.meeting_note ?? null,
        location: openHeroLocation(item.location_ciphertext, process.env.HERO_CERT_SECRET ?? ""),
      })),
    })
  }

  const hero = toHero(row, certificate)
  const open = await heroServerRest(
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
      status: item.status ?? "accepted",
      meetingNote: item.meeting_note ?? null,
      location: openHeroLocation(item.location_ciphertext, process.env.HERO_CERT_SECRET ?? ""),
    })),
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const status = alertsStatus(process.env)
  if (!status.live) return json({ error: status.reason, live: false }, 503)
  await cleanupOldRequests()
  const body = await readJson(request)
  if (!body) return json({ error: "Invalid request" }, 400)

  if (body.action === "request" || body.action === "resource-request") {
    if (limited(`req:${clientKey(request)}`, 4)) return json({ error: "A request was just sent. Please wait before sending another." }, 429)
    const prepared = body.action === "request"
      ? prepareRequest({ lat: body.lat, lon: body.lon, called911: body.called911 })
      : prepareResourceRequest({ lat: body.lat, lon: body.lon, resourceKind: body.resourceKind })
    if (!prepared.ok) return json({ error: prepared.error }, 400)

    const shareExact = body.shareExact === true
    const meetingNote = cleanMeetingNote(body.meetingNote)
    if (prepared.request.kind === "emergency" && !shareExact) {
      return json({ error: "To dispatch a volunteer to an emergency, explicitly allow the accepted Hero to receive your exact location. 911 remains primary." }, 400)
    }
    if (prepared.request.kind === "resource" && !shareExact && !meetingNote) {
      return json({ error: "Choose exact-location sharing with the accepted Hero or enter a short public meeting-point note." }, 400)
    }
    const locationCiphertext = shareExact && typeof body.lat === "number" && typeof body.lon === "number"
      ? sealHeroLocation({ lat: body.lat, lon: body.lon }, process.env.HERO_CERT_SECRET ?? "")
      : null
    if (shareExact && !locationCiphertext) return json({ error: "Could not protect the location handoff." }, 503)

    const requestToken = newRequestToken()
    const saved = await heroServerRest("hero_requests", {
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
        location_ciphertext: locationCiphertext,
        meeting_note: meetingNote,
      }),
    }).catch(() => null)
    if (!saved?.ok) return json({ error: prepared.request.kind === "emergency" ? "The request could not be sent. Stay with 911." : "The resource request could not be posted." }, 503)
    const [row] = (await saved.json()) as RequestRow[]
    if (row?.id) {
      await notifyMatchingHeroes({
        ...prepared.request,
        id: row.id,
      }).catch(() => undefined)
    }
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
    const saved = await heroServerRest(
      `hero_requests?id=eq.${encodeURIComponent(body.requestId)}&request_token_hash=eq.${tokenHash(body.requestToken)}`,
      { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "cancelled", location_ciphertext: null, meeting_note: null }) },
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
    const saved = await heroServerRest("hero_availability?on_conflict=auth_user_id", {
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
    if (!saved?.ok) return json({ error: "Could not save your availability." }, 503)
    await notifyMatchingResourceWatchers(availability).catch(() => undefined)
    return json({ available: true, availableUntil: availability.availableUntil, emergencyReady: availability.emergencyReady, resources: availability.resources })
  }

  if (body.action === "accept") {
    if (typeof body.requestId !== "string") return json({ error: "Request ID is missing." }, 400)
    const mine = await heroServerRest(
      `hero_availability?select=auth_user_id,cell,available_until,paused,emergency_ready,naloxone_on_call,resource_kinds&auth_user_id=eq.${encodeURIComponent(auth.user.id)}`,
    )
    const [availabilityRow] = mine.ok ? ((await mine.json()) as AvailabilityRow[]) : []
    if (!availabilityRow) return json({ error: "Go available before accepting requests." }, 409)
    const hero = toHero(availabilityRow, certificate)

    const wanted = await heroServerRest(
      `hero_requests?select=id,cell,created_at,expires_at,kind,resource_kind,status&id=eq.${encodeURIComponent(body.requestId)}&status=eq.open`,
    )
    const [requestRow] = wanted.ok ? ((await wanted.json()) as RequestRow[]) : []
    if (!requestRow) return json({ error: "That request is no longer open." }, 409)
    const matching = visibleRequests(hero, [toRequest(requestRow)])
    if (matching.length !== 1) return json({ error: "That request is not currently a match for your availability." }, 403)

    const accepted = await heroServerRest(
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

  if (body.action === "en-route" || body.action === "arrive" || body.action === "complete" || body.action === "release") {
    if (typeof body.requestId !== "string") return json({ error: "Request ID is missing." }, 400)
    const now = new Date().toISOString()

    if (body.action === "release") {
      const current = await heroServerRest(
        `hero_requests?select=id,status&id=eq.${encodeURIComponent(body.requestId)}&accepted_by=eq.${encodeURIComponent(auth.user.id)}`,
      ).catch(() => null)
      const [row] = current?.ok ? ((await current.json()) as RequestRow[]) : []
      if (!row || !row.status || !heroCanRelease(row.status)) return json({ error: "That request can no longer be released." }, 409)
      const released = await heroServerRest(
        `hero_requests?id=eq.${encodeURIComponent(body.requestId)}&accepted_by=eq.${encodeURIComponent(auth.user.id)}&status=eq.${row.status}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({
            status: "open",
            accepted_by: null,
            accepted_at: null,
            en_route_at: null,
            arrived_at: null,
          }),
        },
      ).catch(() => null)
      if (!released?.ok) return json({ error: "Could not release the request." }, 503)
      const rows = (await released.json()) as RequestRow[]
      if (rows.length !== 1) return json({ error: "That request changed before it could be released." }, 409)
      const releasedRequest = toRequest(rows[0])
      await notifyMatchingHeroes(releasedRequest).catch(() => undefined)
      return json({ released: true, note: "Request released so another matching Hero can accept it." })
    }

    const expected = body.action === "en-route" ? "accepted" : body.action === "arrive" ? "en_route" : "arrived"
    const nextStatus = body.action === "en-route" ? "en_route" : body.action === "arrive" ? "arrived" : "completed"
    const patch: Record<string, unknown> = { status: nextStatus }
    if (body.action === "en-route") patch.en_route_at = now
    if (body.action === "arrive") patch.arrived_at = now
    if (body.action === "complete") {
      patch.completed_at = now
      patch.location_ciphertext = null
      patch.meeting_note = null
    }

    const saved = await heroServerRest(
      `hero_requests?id=eq.${encodeURIComponent(body.requestId)}&accepted_by=eq.${encodeURIComponent(auth.user.id)}&status=eq.${expected}`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(patch),
      },
    ).catch(() => null)
    if (!saved?.ok) return json({ error: "Could not update the request." }, 503)
    const rows = (await saved.json()) as RequestRow[]
    return rows.length === 1
      ? json({ updated: true, status: nextStatus })
      : json({ error: "That request is no longer in the expected state." }, 409)
  }

  if (body.action === "pause" || body.action === "leave") {
    const path = `hero_availability?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`
    const saved = await (body.action === "pause"
      ? heroServerRest(path, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ paused: true, updated_at: new Date().toISOString() }) })
      : heroServerRest(path, { method: "DELETE", headers: { Prefer: "return=minimal" } })).catch(() => null)
    return saved?.ok ? json({ available: false, removed: body.action === "leave" }) : json({ error: "Could not update your availability." }, 503)
  }

  return json({ error: "Unknown action" }, 400)
}
