import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getSession } from "@/lib/supabase-auth"
import { getUhsSmartConfig } from "@/lib/health/uhs-mychart"
import { clearUhsCookies, hasUsableUhsSecret, openUhsSession, UHS_SESSION_COOKIE } from "@/lib/health/uhs-oauth"
import {
  normalizeAppointments,
  normalizeConditions,
  normalizeEncounters,
  normalizeGoals,
  normalizePatient,
  normalizeVitals,
} from "@/lib/health/fhir-summary"

export const dynamic = "force-dynamic"
const headers = { "Cache-Control": "private, no-store" }

class FhirError extends Error {
  constructor(readonly status: number) { super(`FHIR ${status}`) }
}

async function fhirGet(baseUrl: string, accessToken: string, path: string) {
  const response = await fetch(`${baseUrl}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/fhir+json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new FhirError(response.status)
  return response.json()
}

const disconnected = async () => {
  clearUhsCookies(await cookies())
  return NextResponse.json({ connected: false, configured: true }, { status: 401, headers })
}

export async function GET() {
  const config = getUhsSmartConfig()
  const secret = process.env.UHS_SMART_SESSION_SECRET
  if (!config.configured || !config.fhirBaseUrl || !hasUsableUhsSecret(secret)) {
    return NextResponse.json({ connected: false, configured: false }, { status: 503, headers })
  }

  const value = (await cookies()).get(UHS_SESSION_COOKIE)?.value
  const session = value ? await openUhsSession(value, secret) : null
  if (!session?.patient) return disconnected()
  // Records are returned only to the NarcoGuard account that made the connection, and only while it is signed in.
  const user = await getSession()
  if (!user?.id || user.id !== session.userId) return disconnected()

  const patient = encodeURIComponent(session.patient)
  const base = config.fhirBaseUrl
  const reads = await Promise.allSettled([
    fhirGet(base, session.accessToken, `Patient/${patient}`),
    fhirGet(base, session.accessToken, `Observation?patient=${patient}&category=vital-signs&_count=20`),
    fhirGet(base, session.accessToken, `Condition?patient=${patient}&_count=50`),
    fhirGet(base, session.accessToken, `Encounter?patient=${patient}&_count=30`),
    fhirGet(base, session.accessToken, `Appointment?patient=${patient}&_count=30`),
    fhirGet(base, session.accessToken, `Goal?patient=${patient}&_count=30`),
  ])
  // A revoked or expired upstream token means the connection is gone, not a temporary failure.
  if (reads.some((read) => read.status === "rejected" && read.reason instanceof FhirError && (read.reason.status === 401 || read.reason.status === 403))) {
    return disconnected()
  }
  if (reads.every((read) => read.status === "rejected")) {
    return NextResponse.json({ connected: true, error: "UHS records could not be read right now." }, { status: 502, headers })
  }
  const [patientResource, vitals, conditions, encounters, appointments, goals] = reads.map((read) => (read.status === "fulfilled" ? read.value : null))
  const unavailable = ["patient", "vitals", "conditions", "encounters", "appointments", "goals"].filter((_, index) => reads[index].status === "rejected")
  return NextResponse.json({
    connected: true,
    checkedAt: new Date().toISOString(),
    patient: normalizePatient(patientResource),
    vitals: normalizeVitals(vitals),
    conditions: normalizeConditions(conditions),
    encounters: normalizeEncounters(encounters),
    appointments: normalizeAppointments(appointments),
    goals: normalizeGoals(goals),
    unavailable,
  }, { headers })
}
