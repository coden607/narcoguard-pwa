export type FhirResource = {
  resourceType?: string
  id?: string
  [key: string]: unknown
}

export type FhirBundle = {
  resourceType?: string
  entry?: { resource?: FhirResource; search?: { mode?: unknown } }[]
}

const textFromConcept = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null
  const concept = value as { text?: unknown; coding?: { display?: unknown }[] }
  if (typeof concept.text === "string" && concept.text.trim()) return concept.text.trim()
  const display = concept.coding?.find(item => typeof item.display === "string")?.display
  return typeof display === "string" && display.trim() ? display.trim() : null
}

/** Only real search matches of the expected type: OperationOutcome and included resources are dropped. */
const asEntries = (bundle: unknown, resourceType: string) => {
  if (!bundle || typeof bundle !== "object") return []
  const entries = (bundle as FhirBundle).entry
  if (!Array.isArray(entries)) return []
  return entries.flatMap(entry => {
    const mode = entry?.search?.mode
    if (!entry?.resource || entry.resource.resourceType !== resourceType) return []
    if (mode !== undefined && mode !== "match") return []
    return [entry.resource]
  })
}

const codeOf = (value: unknown) => {
  if (!value || typeof value !== "object") return null
  const coding = (value as { coding?: { code?: unknown }[] }).coding
  const code = Array.isArray(coding) ? coding.find(item => typeof item?.code === "string")?.code : null
  return typeof code === "string" ? code : null
}

type HumanName = { use?: unknown; text?: unknown; given?: unknown[]; family?: unknown; period?: { end?: unknown } }
const NAME_PREFERENCE = ["usual", "official", undefined, "nickname"]

/** The current display name: usual, then official; never old, maiden, temp or an ended name. */
function currentName(names: HumanName[] | undefined) {
  if (!Array.isArray(names)) return undefined
  const current = names.filter(name => {
    if (!name || typeof name !== "object") return false
    if (name.use === "old" || name.use === "maiden" || name.use === "temp" || name.use === "anonymous") return false
    const end = typeof name.period?.end === "string" ? Date.parse(name.period.end) : NaN
    return !(Number.isFinite(end) && end < Date.now())
  })
  const rank = (name: HumanName) => {
    const index = NAME_PREFERENCE.indexOf(typeof name.use === "string" ? name.use : undefined)
    return index === -1 ? NAME_PREFERENCE.length : index
  }
  return [...current].sort((a, b) => rank(a) - rank(b))[0]
}

const INVALID_OBSERVATION_STATUS = new Set(["entered-in-error", "cancelled"])
const INVALID_CONDITION_VERIFICATION = new Set(["refuted", "entered-in-error"])

export function normalizePatient(resource: unknown) {
  if (!resource || typeof resource !== "object") return null
  const patient = resource as {
    name?: HumanName[]
    birthDate?: unknown
  }
  const first = currentName(patient.name)
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

type Quantity = { value?: unknown; unit?: unknown }
const formatQuantity = (quantity: Quantity | undefined) => (typeof quantity?.value === "number" ? quantity.value : null)

export function normalizeVitals(bundle: unknown) {
  return asEntries(bundle, "Observation").slice(0, 20).flatMap(resource => {
    // Withdrawn or cancelled measurements are never shown as ordinary readings.
    if (typeof resource.status !== "string" || INVALID_OBSERVATION_STATUS.has(resource.status)) return []
    const code = textFromConcept(resource.code)
    if (!code) return []
    const base = {
      id: typeof resource.id === "string" ? resource.id : undefined,
      name: code,
      at: typeof resource.effectiveDateTime === "string" ? resource.effectiveDateTime : typeof resource.issued === "string" ? resource.issued : null,
    }
    const valueQuantity = resource.valueQuantity as Quantity | undefined
    if (typeof valueQuantity?.value === "number") {
      return [{ ...base, value: String(valueQuantity.value), unit: typeof valueQuantity.unit === "string" ? valueQuantity.unit : null }]
    }
    // Blood pressure keeps systolic and diastolic in components (LOINC 8480-6 / 8462-4).
    const components = Array.isArray(resource.component) ? resource.component as { code?: unknown; valueQuantity?: Quantity }[] : []
    const part = (loinc: string) => components.find(item => codeOf(item?.code) === loinc)?.valueQuantity
    const systolic = formatQuantity(part("8480-6"))
    const diastolic = formatQuantity(part("8462-4"))
    if (systolic === null || diastolic === null) return []
    const unit = part("8480-6")?.unit
    return [{ ...base, value: `${systolic}/${diastolic}`, unit: typeof unit === "string" ? unit : null }]
  })
}

export function normalizeConditions(bundle: unknown) {
  return asEntries(bundle, "Condition").slice(0, 50).flatMap(resource => {
    // Refuted or entered-in-error diagnoses are not conditions the person has.
    const verification = codeOf(resource.verificationStatus)
    if (verification && INVALID_CONDITION_VERIFICATION.has(verification)) return []
    const name = textFromConcept(resource.code)
    return name ? [{ id: typeof resource.id === "string" ? resource.id : undefined, name }] : []
  })
}

export function normalizeAppointments(bundle: unknown) {
  return asEntries(bundle, "Appointment").slice(0, 30).flatMap(resource => {
    const status = typeof resource.status === "string" ? resource.status : "unknown"
    const start = typeof resource.start === "string" ? resource.start : null
    const serviceType = Array.isArray(resource.serviceType) ? textFromConcept(resource.serviceType[0]) : null
    const description = typeof resource.description === "string" ? resource.description : null
    return [{ id: typeof resource.id === "string" ? resource.id : undefined, status, start, description: description || serviceType }]
  })
}

export function normalizeEncounters(bundle: unknown) {
  return asEntries(bundle, "Encounter").slice(0, 30).filter(resource => resource.status !== "entered-in-error").map(resource => ({
    id: typeof resource.id === "string" ? resource.id : undefined,
    status: typeof resource.status === "string" ? resource.status : "unknown",
    type: Array.isArray(resource.type) ? textFromConcept(resource.type[0]) : null,
    start: resource.period && typeof resource.period === "object" && typeof (resource.period as { start?: unknown }).start === "string"
      ? (resource.period as { start: string }).start
      : null,
  }))
}

export function normalizeGoals(bundle: unknown) {
  return asEntries(bundle, "Goal").slice(0, 30).flatMap(resource => {
    if (resource.lifecycleStatus === "entered-in-error") return []
    const description = textFromConcept(resource.description)
    if (!description) return []
    return [{
      id: typeof resource.id === "string" ? resource.id : undefined,
      description,
      status: typeof resource.lifecycleStatus === "string" ? resource.lifecycleStatus : "unknown",
    }]
  })
}
