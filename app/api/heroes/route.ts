import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { heroSecret, verifyCertificate } from "@/lib/hero-certification"
import { getAuthContext, isAuthConfigured, serviceRest } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

const enrollmentAvailable = () => isAuthConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) && Boolean(heroSecret())

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
  const response = await serviceRest(
    `hero_certifications?auth_user_id=eq.${encodeURIComponent(userId)}&select=auth_user_id,test_version,passed_at,expires_at,enrolled,naloxone_ready,naloxone_expires_on,on_call,on_call_since`,
  ).catch(() => null)
  if (!response?.ok) return null
  const rows = (await response.json()) as HeroRow[]
  return rows[0] ?? null
}

const validDate = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)

export async function GET() {
  const auth = await getAuthContext().catch(() => null)
  const hero = auth ? await ownHeroRow(auth.user.id) : null
  return json({
    enrollment: enrollmentAvailable(),
    certification: Boolean(heroSecret()),
    nearbyRequests: false,
    hero,
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  if (!enrollmentAvailable()) return json({ error: "Hero enrollment is not switched on yet." }, 503)
  const body = await readJson(request)
  const certificate = verifyCertificate(body?.certificate, heroSecret()!)
  if (!certificate) return json({ error: "Pass the certification test with every answer correct before enrolling." }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to enroll." }, 401)
  const response = await serviceRest("hero_certifications?on_conflict=auth_user_id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      auth_user_id: auth.user.id,
      test_version: certificate.v,
      passed_at: new Date(certificate.passedAt).toISOString(),
      expires_at: new Date(certificate.exp).toISOString(),
      enrolled: true,
    }),
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
  const nextNaloxoneReady = body?.naloxoneReady === true
  const nextExpiry = validDate(body?.naloxoneExpiresOn) ? body.naloxoneExpiresOn : null
  const wantsOnCall = body?.onCall === true
  const expiryOk = Boolean(nextExpiry && nextExpiry >= new Date().toISOString().slice(0, 10))
  const certOk = new Date(existing.expires_at).getTime() > Date.now()

  if (wantsOnCall && (!nextNaloxoneReady || !expiryOk || !certOk)) {
    return json({ error: "To go On Call, your Hero certificate must be current and you must confirm unexpired naloxone is physically with you." }, 400)
  }

  const response = await serviceRest(`hero_certifications?auth_user_id=eq.${encodeURIComponent(auth.user.id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      naloxone_ready: nextNaloxoneReady,
      naloxone_expires_on: nextExpiry,
      on_call: wantsOnCall,
    }),
  }).catch(() => null)
  if (!response?.ok) return json({ error: "Could not update Hero readiness." }, 503)
  const rows = (await response.json()) as HeroRow[]
  return json({ hero: rows[0] ?? null })
}
