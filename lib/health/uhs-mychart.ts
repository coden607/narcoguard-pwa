export const UHS_MYCHART_URL = "https://mychart.nyuhs.org/MyChart/Authentication/Login"

export const UHS_SMART_SCOPES = [
  "openid",
  "fhirUser",
  "patient/Patient.read",
  "patient/Observation.read",
  "patient/Condition.read",
  "patient/Encounter.read",
  "patient/Appointment.read",
  "patient/Goal.read",
] as const

export type UhsSmartConfig = {
  configured: boolean
  authUrl: string | null
  tokenUrl: string | null
  fhirBaseUrl: string | null
  clientId: string | null
  scopes: readonly string[]
}

const absoluteHttps = (value?: string) => {
  if (!value) return null
  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString().replace(/\/$/, "") : null
  } catch {
    return null
  }
}

export function getUhsSmartConfig(env: NodeJS.ProcessEnv = process.env): UhsSmartConfig {
  const authUrl = absoluteHttps(env.UHS_SMART_AUTH_URL)
  const tokenUrl = absoluteHttps(env.UHS_SMART_TOKEN_URL)
  const fhirBaseUrl = absoluteHttps(env.UHS_FHIR_BASE_URL)
  const clientId = env.UHS_SMART_CLIENT_ID?.trim() || null
  return {
    configured: Boolean(authUrl && tokenUrl && fhirBaseUrl && clientId),
    authUrl,
    tokenUrl,
    fhirBaseUrl,
    clientId,
    scopes: UHS_SMART_SCOPES,
  }
}
