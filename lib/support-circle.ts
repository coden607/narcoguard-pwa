/**
 * Support-circle check-ins (Feature 22).
 *
 * Opt-in, bounded, read-only visibility for user-approved trusted contacts.
 * A contact sees only what the user explicitly shared:
 * - "I'm safe" check-ins the user published
 * - preparedness-plan items the user marked shareable
 * - follow-through nudges the user marked shareable
 *
 * Hard boundary: predictions, need history, calibration data, and watch
 * details never enter the shared state or the circle view. The view type
 * has no such fields, so there is nothing to leak. Consent is per-scope,
 * revocable at any time, and every consent change is audit-logged.
 */

export const SUPPORT_CIRCLE_KEY = "narcoguard_support_circle_v1"
export const SUPPORT_CIRCLE_MAX_CONTACTS = 5
export const CIRCLE_CHECKIN_RETENTION = 30
export const CIRCLE_PLAN_RETENTION = 30
export const CIRCLE_NUDGE_RETENTION = 30
export const CIRCLE_VIEW_LIMIT = 10

export type CircleScope = "preparedness-plan" | "safe-checkins" | "follow-through-nudges"

export const CIRCLE_SCOPES: readonly CircleScope[] = ["preparedness-plan", "safe-checkins", "follow-through-nudges"]

export interface SupportContact {
  id: string
  name: string
  approvedScopes: CircleScope[]
  approvedAt: string
}

export interface SafeCheckIn {
  id: string
  at: string
  note?: string
}

export interface SharedPlanItem {
  id: string
  label: string
  dueDate?: string
}

export interface FollowThroughNudge {
  id: string
  at: string
  label: string
}

export interface CircleAuditEntry {
  at: string
  action: "approve" | "revoke" | "scopes-updated" | "share-plan" | "unshare-plan"
  contactId: string
  detail: string
}

interface SupportCircleState {
  version: 1
  contacts: SupportContact[]
  checkIns: SafeCheckIn[]
  plans: SharedPlanItem[]
  nudges: FollowThroughNudge[]
  audit: CircleAuditEntry[]
  /** Monotonic id sequence so shared item ids stay unique without wall-clock assumptions. */
  seq: number
}

type StorageLike = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const emptyState = (): SupportCircleState => ({ version: 1, contacts: [], checkIns: [], plans: [], nudges: [], audit: [], seq: 0 })

export function readSupportCircle(storage: StorageLike): SupportCircleState {
  try {
    const raw = storage.getItem(SUPPORT_CIRCLE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<SupportCircleState>
    if (parsed?.version !== 1 || !Array.isArray(parsed.contacts) || !Array.isArray(parsed.audit)) return emptyState()
    return {
      ...emptyState(),
      contacts: parsed.contacts,
      checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns : [],
      plans: Array.isArray(parsed.plans) ? parsed.plans : [],
      nudges: Array.isArray(parsed.nudges) ? parsed.nudges : [],
      audit: parsed.audit,
      seq: typeof parsed.seq === "number" && Number.isFinite(parsed.seq) ? parsed.seq : 0,
    }
  } catch {
    return emptyState()
  }
}

function writeSupportCircle(storage: StorageLike, state: SupportCircleState): void {
  storage.setItem(SUPPORT_CIRCLE_KEY, JSON.stringify(state))
}

const validScopes = (scopes: readonly string[]): scopes is CircleScope[] =>
  scopes.length > 0 && scopes.every((scope) => (CIRCLE_SCOPES as readonly string[]).includes(scope))

const audit = (state: SupportCircleState, at: string, action: CircleAuditEntry["action"], contactId: string, detail: string): void => {
  state.audit.push({ at, action, contactId, detail })
}

export interface ConsentResult {
  ok: boolean
  reason: string
  contact?: SupportContact
}

/** Approves a contact for explicit scopes. Rejects empty/unknown scopes, duplicates, and overflow. */
export function approveContact(
  storage: StorageLike,
  input: { id: string; name: string; scopes: readonly CircleScope[] },
  at = new Date().toISOString(),
): ConsentResult {
  if (typeof input.id !== "string" || input.id.length === 0) return { ok: false, reason: "contact id required" }
  if (!validScopes(input.scopes)) return { ok: false, reason: "at least one valid scope required" }
  const state = readSupportCircle(storage)
  if (state.contacts.some((contact) => contact.id === input.id)) return { ok: false, reason: "contact already approved" }
  if (state.contacts.length >= SUPPORT_CIRCLE_MAX_CONTACTS) {
    return { ok: false, reason: `circle is full (max ${SUPPORT_CIRCLE_MAX_CONTACTS})` }
  }
  const contact: SupportContact = { id: input.id, name: input.name, approvedScopes: [...input.scopes], approvedAt: at }
  state.contacts.push(contact)
  audit(state, at, "approve", contact.id, `approved scopes: ${contact.approvedScopes.join(", ")}`)
  writeSupportCircle(storage, state)
  return { ok: true, reason: "approved", contact }
}

/** Revokes consent entirely. Visibility ends immediately. */
export function revokeContact(storage: StorageLike, contactId: string, at = new Date().toISOString()): ConsentResult {
  const state = readSupportCircle(storage)
  const index = state.contacts.findIndex((contact) => contact.id === contactId)
  if (index < 0) return { ok: false, reason: "contact not found" }
  const [removed] = state.contacts.splice(index, 1)
  audit(state, at, "revoke", contactId, `revoked all scopes for ${removed.name}`)
  writeSupportCircle(storage, state)
  return { ok: true, reason: "revoked" }
}

/** Replaces a contact's scopes. Narrowing a scope takes effect immediately. */
export function updateScopes(
  storage: StorageLike,
  contactId: string,
  scopes: readonly CircleScope[],
  at = new Date().toISOString(),
): ConsentResult {
  if (!validScopes(scopes)) return { ok: false, reason: "at least one valid scope required" }
  const state = readSupportCircle(storage)
  const contact = state.contacts.find((entry) => entry.id === contactId)
  if (!contact) return { ok: false, reason: "contact not found" }
  const before = new Set(contact.approvedScopes)
  const after = new Set(scopes)
  const added = scopes.filter((scope) => !before.has(scope))
  const removed = contact.approvedScopes.filter((scope) => !after.has(scope))
  contact.approvedScopes = [...scopes]
  audit(state, at, "scopes-updated", contactId, `added: ${added.join(", ") || "none"}; removed: ${removed.join(", ") || "none"}`)
  writeSupportCircle(storage, state)
  return { ok: true, reason: "scopes updated", contact }
}

const nextShareId = (state: SupportCircleState, prefix: string, at: string): string => {
  state.seq += 1
  return `${prefix}-${at.slice(0, 10)}-${state.seq}`
}

/** Publishes an "I'm safe" check-in. Retention is bounded; oldest drop first. */
export function publishSafeCheckIn(storage: StorageLike, input: { note?: string }, at = new Date().toISOString()): SafeCheckIn {
  const state = readSupportCircle(storage)
  const checkIn: SafeCheckIn = { id: nextShareId(state, "checkin", at), at, ...(input.note ? { note: input.note } : {}) }
  state.checkIns.push(checkIn)
  if (state.checkIns.length > CIRCLE_CHECKIN_RETENTION) state.checkIns = state.checkIns.slice(-CIRCLE_CHECKIN_RETENTION)
  writeSupportCircle(storage, state)
  return checkIn
}

/** Marks a preparedness-plan item as shareable with the circle. */
export function sharePlanItem(storage: StorageLike, input: { label: string; dueDate?: string }, at = new Date().toISOString()): SharedPlanItem {
  const state = readSupportCircle(storage)
  const item: SharedPlanItem = { id: nextShareId(state, "plan", at), label: input.label, ...(input.dueDate ? { dueDate: input.dueDate } : {}) }
  state.plans.push(item)
  if (state.plans.length > CIRCLE_PLAN_RETENTION) state.plans = state.plans.slice(-CIRCLE_PLAN_RETENTION)
  writeSupportCircle(storage, state)
  return item
}

export function unsharePlanItem(storage: StorageLike, itemId: string, contactId = "*", at = new Date().toISOString()): boolean {
  const state = readSupportCircle(storage)
  const before = state.plans.length
  state.plans = state.plans.filter((item) => item.id !== itemId)
  if (state.plans.length === before) return false
  audit(state, at, "unshare-plan", contactId, `unshared plan item ${itemId}`)
  writeSupportCircle(storage, state)
  return true
}

/** Publishes a follow-through nudge the user chose to share ("plan to pick up kit today"). */
export function shareNudge(storage: StorageLike, input: { label: string }, at = new Date().toISOString()): FollowThroughNudge {
  const state = readSupportCircle(storage)
  const nudge: FollowThroughNudge = { id: nextShareId(state, "nudge", at), at, label: input.label }
  state.nudges.push(nudge)
  if (state.nudges.length > CIRCLE_NUDGE_RETENTION) state.nudges = state.nudges.slice(-CIRCLE_NUDGE_RETENTION)
  writeSupportCircle(storage, state)
  return nudge
}

/**
 * The contact's read-only view. Returns null unless the contact is approved.
 * Parts are filtered by approved scopes and capped. This type deliberately
 * has no fields for predictions, need history, or calibration data.
 */
export interface CircleView {
  contact: { id: string; name: string }
  safeCheckIns: SafeCheckIn[]
  sharedPlans: SharedPlanItem[]
  followThroughNudges: FollowThroughNudge[]
}

export function buildCircleView(storage: StorageLike, contactId: string): CircleView | null {
  const state = readSupportCircle(storage)
  const contact = state.contacts.find((entry) => entry.id === contactId)
  if (!contact) return null
  const scoped = (scope: CircleScope) => contact.approvedScopes.includes(scope)
  return {
    contact: { id: contact.id, name: contact.name },
    safeCheckIns: scoped("safe-checkins") ? state.checkIns.slice(-CIRCLE_VIEW_LIMIT) : [],
    sharedPlans: scoped("preparedness-plan") ? state.plans.slice(-CIRCLE_VIEW_LIMIT) : [],
    followThroughNudges: scoped("follow-through-nudges") ? state.nudges.slice(-CIRCLE_VIEW_LIMIT) : [],
  }
}

export function circleAuditLog(storage: StorageLike, contactId?: string): CircleAuditEntry[] {
  const log = readSupportCircle(storage).audit
  return contactId ? log.filter((entry) => entry.contactId === contactId) : log
}
