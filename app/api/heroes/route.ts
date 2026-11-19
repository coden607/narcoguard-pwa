import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { alertsStatus } from "@/lib/hero-alerts"
import { acceptsHeroNaloxoneAttestation, heroSecret, verifyCertificate } from "@/lib/hero-certification"
import { canGoOnCall, parseNaloxoneExpiry, utcDate } from "@/lib/hero-readiness"
import { getAuthContext, heroServerRest, isAuthConfigured, isHeroServerConfigured } from "@/lib/supabase-auth"

// Hero enrollment: a signed-in account with a valid 100% certificate. Nearby help requests stay
// off until a separate safety and privacy review approves them (no location is collected here).
// On-call readiness is only the person's attestation that they are carrying unexpired naloxone.

export const dynamic = "force-dynamic"

const enrollmentAvailable = () => isAuthConfigured() && isHeroServerConfigured() && Boolean(heroSecret())

const HERO_COLUMNS = "auth_user_id,test_version,passed_at,expires_at,enrolled,naloxone_ready,naloxone_expires_on,on_call,on_call_since"

type HeroRow = {
  auth_user_id: string
  test_version: number
  passed_at: string
  expires_at: string
  enrolled: boolean
  naloxone_ready: boolean
  naloxone_expires_on: string | null
  on_call: boolean
  on_call_since: string | null
}

async function ownHeroRow(userId: string): Promise<HeroRow | null> {
  const response = await heroServerRest(
    `hero_certifications?auth_user_id=eq.${encodeURIComponent(userId)}&select=${HERO_COLUMNS}`,
  ).catch(() => null)
  if (!response?.ok) return null
  const rows = (await response.json()) as HeroRow[]
  return rows[0] ?? null
}

const readinessOf = (hero: HeroRow) => ({
  enrolled: hero.enrolled,
  expiresAt: hero.expires_at,
  naloxoneReady: hero.naloxone_ready,
  naloxoneExpiresOn: hero.naloxone_expires_on,
})

export async function GET() {
  const nearbyRequests = alertsStatus(process.env).live
  if (!enrollmentAvailable()) {
    return json({ enrollment: false, certification: Boolean(heroSecret()), nearbyRequests, onCallCount: null, hero: null })
  }

  const today = utcDate()
  const [auth, countResponse] = await Promise.all([
    getAuthContext().catch(() => null),
    heroServerRest(
      `hero_certifications?on_call=eq.true&enrolled=eq.true&naloxone_ready=eq.true&naloxone_expires_on=gte.${today}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&select=auth_user_id`,
    ).catch(() => null),
  ])
  let hero = auth ? await ownHeroRow(auth.user.id) : null
  if (hero?.on_call && !canGoOnCall(readinessOf(hero))) {
    const cleared = await heroServerRest(`hero_certifications?auth_user_id=eq.${encodeURIComponent(hero.auth_user_id)}`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ on_call: false }),
    }).catch(() => null)
    if (cleared?.ok) hero = { ...hero, on_call: false, on_call_since: null }
  }
  const onCallCount = countResponse?.ok ? ((await countResponse.json()) as { auth_user_id: string }[]).length : null

  return json({
    enrollment: true,
    certification: Boolean(heroSecret()),
    nearbyRequests,
    onCallCount,
    hero,
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!enrollmentAvailable()) return json({ error: "Hero enrollment is not switched on yet." }, 503)
  const body = await readJson(request)
  if (!acceptsHeroNaloxoneAttestation(body?.naloxoneOnCall)) return json({ error: "Confirm that you will carry naloxone whenever you choose to be available as a Hero." }, 400)
  const certificate = verifyCertificate(body?.certificate, heroSecret()!)
  if (!certificate) return json({ error: "Pass the certification test with every answer correct before enrolling." }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to enroll." }, 401)
  const response = await heroServerRest("hero_certifications?on_conflict=auth_user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ auth_user_id: auth.user.id, test_version: certificate.v, passed_at: new Date(certificate.passedAt).toISOString(), expires_at: new Date(certificate.exp).toISOString(), enrolled: true }),
  }).catch(() => null)
  if (!response?.ok) return json({ error: "Enrollment is unavailable." }, 503)
  return json({ enrolled: true, expiresAt: certificate.exp })
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!enrollmentAvailable()) return json({ error: "Hero readiness is unavailable." }, 503)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in first." }, 401)
  const existing = await ownHeroRow(auth.user.id)
  if (!existing?.enrolled) return json({ error: "Enroll with a valid Hero certificate first." }, 403)

  const body = await readJson(request)
  const expiry = parseNaloxoneExpiry(body?.naloxoneExpiresOn)
  if (!expiry.ok) return json({ error: "Enter the naloxone expiration as a calendar date, or leave it blank." }, 400)
  const naloxoneReady = body?.naloxoneReady === true
  const wantsOnCall = body?.onCall === true
  if (wantsOnCall && !canGoOnCall({ ...readinessOf(existing), naloxoneReady, naloxoneExpiresOn: expiry.date })) {
    return json({ error: "To go On Call, your Hero certificate must be current and you must confirm unexpired naloxone is physically with you." }, 400)
  }

  const response = await heroServerRest(`hero_certifications?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      naloxone_ready: naloxoneReady,
      naloxone_expires_on: expiry.date,
      on_call: wantsOnCall,
    }),
  }).catch(() => null)
  if (!response?.ok) return json({ error: "Could not update Hero readiness." }, 503)
  const rows = (await response.json()) as HeroRow[]
  return json({ hero: rows[0] ?? null })
}
