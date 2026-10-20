export type FhirResource = {
  resourceType?: string
  id?: string
  [key: string]: unknown
}

export type FhirBundle = {
  resourceType?: string
  entry?: { resource?: FhirResource }[]
}

const textFromConcept = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null
  const concept = value as { text?: unknown; coding?: { display?: unknown }[] }
  if (typeof concept.text === "string" && concept.text.trim()) return concept.text.trim()
  const display = concept.coding?.find(item => typeof item.display === "string")?.display
  return typeof display === "string" && display.trim() ? display.trim() : null
}

const asEntries = (bundle: unknown) => {
  if (!bundle || typeof bundle !== "object") return []
  const entries = (bundle as FhirBundle).entry
  return Array.isArray(entries) ? entries.flatMap(entry => entry.resource ? [entry.resource] : []) : []
}

export function normalizePatient(resource: unknown) {
  if (!resource || typeof resource !== "object") return null
  const patient = resource as {
    name?: { text?: unknown; given?: unknown[]; family?: unknown }[]
    birthDate?: unknown
  }
  const first = patient.name?.[0]
  const explicit = typeof first?.text === "string" ? first.text.trim() : ""
  const parts = [
    ...(Array.isArray(first?.given) ? first.given.filter((x): x is string => typeof x === "string") : []),
    typeof first?.family === "string" ? first.family : "",
  ].filter(Boolean)
  return {
    name: explicit || parts.join(" ") || null,
    birthDate: typeof patient.birthDate === "string" ? patient.birthDate : null,
  }
}

export function normalizeVitals(bundle: unknown) {
  return asEntries(bundle).slice(0, 20).flatMap(resource => {
    const valueQuantity = resource.valueQuantity as { value?: unknown; unit?: unknown } | undefined
    const code = textFromConcept(resource.code)
    if (!code || typeof valueQuantity?.value !== "number") return []
    return [{
      id: typeof resource.id === "string" ? resource.id : undefined,
      name: code,
      value: valueQuantity.value,
      unit: typeof valueQuantity.unit === "string" ? valueQuantity.unit : null,
      at: typeof resource.effectiveDateTime === "string" ? resource.effectiveDateTime : typeof resource.issued === "string" ? resource.issued : null,
    }]
  })
}

export function normalizeConditions(bundle: unknown) {
  return asEntries(bundle).slice(0, 50).flatMap(resource => {
    const name = textFromConcept(resource.code)
    return name ? [{ id: typeof resource.id === "string" ? resource.id : undefined, name }] : []
  })
}

export function normalizeAppointments(bundle: unknown) {
  return asEntries(bundle).slice(0, 30).flatMap(resource => {
    const status = typeof resource.status === "string" ? resource.status : "unknown"
    const start = typeof resource.start === "string" ? resource.start : null
    const serviceType = Array.isArray(resource.serviceType) ? textFromConcept(resource.serviceType[0]) : null
    const description = typeof resource.description === "string" ? resource.description : null
    return [{ id: typeof resource.id === "string" ? resource.id : undefined, status, start, description: description || serviceType }]
  })
}

export function normalizeEncounters(bundle: unknown) {
  return asEntries(bundle).slice(0, 30).map(resource => ({
    id: typeof resource.id === "string" ? resource.id : undefined,
    status: typeof resource.status === "string" ? resource.status : "unknown",
    type: Array.isArray(resource.type) ? textFromConcept(resource.type[0]) : null,
    start: resource.period && typeof resource.period === "object" && typeof (resource.period as { start?: unknown }).start === "string"
      ? (resource.period as { start: string }).start
      : null,
  }))
}

export function normalizeGoals(bundle: unknown) {
  return asEntries(bundle).slice(0, 30).flatMap(resource => {
    const description = textFromConcept(resource.description)
    if (!description) return []
    return [{
      id: typeof resource.id === "string" ? resource.id : undefined,
      description,
      status: typeof resource.lifecycleStatus === "string" ? resource.lifecycleStatus : "unknown",
    }]
  })
}
