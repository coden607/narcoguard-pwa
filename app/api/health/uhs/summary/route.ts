import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getUhsSmartConfig } from "@/lib/health/uhs-mychart"
import { openUhsSession, UHS_SESSION_COOKIE } from "@/lib/health/uhs-oauth"
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

async function fhirGet(baseUrl: string, accessToken: string, path: string) {
  const response = await fetch(`${baseUrl}/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/fhir+json" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`FHIR ${response.status}`)
  return response.json()
}

export async function GET() {
  const config = getUhsSmartConfig()
  const secret = process.env.UHS_SMART_SESSION_SECRET
  if (!config.configured || !config.fhirBaseUrl || !secret) {
    return NextResponse.json({ connected: false, configured: false }, { status: 503, headers })
  }

  const value = (await cookies()).get(UHS_SESSION_COOKIE)?.value
  const session = value ? await openUhsSession(value, secret) : null
  if (!session?.patient) {
    return NextResponse.json({ connected: false, configured: true }, { status: 401, headers })
  }

  const patient = encodeURIComponent(session.patient)
  try {
    const [patientResource, vitals, conditions, encounters, appointments, goals] = await Promise.all([
      fhirGet(config.fhirBaseUrl, session.accessToken, `Patient/${patient}`),
      fhirGet(config.fhirBaseUrl, session.accessToken, `Observation?patient=${patient}&category=vital-signs&_count=20`),
      fhirGet(config.fhirBaseUrl, session.accessToken, `Condition?patient=${patient}&_count=50`),
      fhirGet(config.fhirBaseUrl, session.accessToken, `Encounter?patient=${patient}&_count=30`),
      fhirGet(config.fhirBaseUrl, session.accessToken, `Appointment?patient=${patient}&_count=30`),
      fhirGet(config.fhirBaseUrl, session.accessToken, `Goal?patient=${patient}&_count=30`),
    ])
    return NextResponse.json({
      connected: true,
      checkedAt: new Date().toISOString(),
      patient: normalizePatient(patientResource),
      vitals: normalizeVitals(vitals),
      conditions: normalizeConditions(conditions),
      encounters: normalizeEncounters(encounters),
      appointments: normalizeAppointments(appointments),
      goals: normalizeGoals(goals),
    }, { headers })
  } catch {
    return NextResponse.json({ connected: true, error: "UHS records could not be read right now." }, { status: 502, headers })
  }
}
