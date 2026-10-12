import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { getAuthContext, serviceRest, userRest } from "@/lib/supabase-auth"
import {
  REPORT_STATUSES,
  canTransition,
  cleanDetails,
  isModerationRole,
  isReportReason,
  isValidResourceRef,
  transition,
  type ReportStatus,
} from "@/lib/resource-moderation"

export const dynamic = "force-dynamic"

type ReportRow = {
  id: string
  resource_ref: string
  reporter_id: string | null
  reason: string
  details: string
  status: ReportStatus
  resolution: string | null
  created_at: string
  updated_at: string
}

async function requireModerator(userId: string): Promise<boolean> {
  const res = await serviceRest(`users?select=role&auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`)
  if (!res.ok) return false
  const rows = (await res.json().catch(() => [])) as { role: string | null }[]
  return rows.length > 0 && isModerationRole(rows[0].role)
}

/** File a report about a resource. Signed-in users only; reporter identity is enforced by RLS. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to file a report." }, 401)

  const body = await readJson(request)
  const resourceRef = body?.resourceRef
  const reason = body?.reason
  const details = cleanDetails(body?.details)
  if (!isValidResourceRef(resourceRef)) {
    return json({ error: "Provide a source-scoped resource reference." }, 400)
  }
  if (!isReportReason(reason)) return json({ error: "Provide a valid report reason." }, 400)
  if (!details) return json({ error: "Provide report details (1-2000 characters)." }, 400)

  const insert = await userRest(auth.accessToken, "resource_reports", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ resource_ref: resourceRef.trim(), reporter_id: auth.user.id, reason, details }),
  })
  if (!insert.ok) return json({ error: "Could not file the report." }, 502)
  const [row] = (await insert.json().catch(() => [])) as Pick<ReportRow, "id">[]
  if (!row?.id) return json({ error: "Could not file the report." }, 502)

  // Audit trail write is server-only; failure to log must not lose the report.
  await serviceRest("resource_moderation_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ report_id: row.id, actor_id: auth.user.id, action: "submitted" }),
  }).catch(() => null)

  return json({ id: row.id }, 201)
}

/** Moderator-only queue view. Status filter plus newest-first paging by limit. */
export async function GET(request: Request) {
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to view the moderation queue." }, 401)
  if (!(await requireModerator(auth.user.id))) {
    return json({ error: "Moderator access required." }, 403)
  }

  const params = new URL(request.url).searchParams
  const status = params.get("status") ?? "open"
  if (!(REPORT_STATUSES as readonly string[]).includes(status)) {
    return json({ error: "Provide a valid status filter." }, 400)
  }
  const limit = Math.min(Number(params.get("limit")) || 50, 100)

  const res = await serviceRest(
    `resource_reports?select=id,resource_ref,reporter_id,reason,details,status,resolution,created_at,updated_at&status=eq.${status}&order=created_at.desc&limit=${limit}`,
  )
  if (!res.ok) return json({ error: "Could not load the moderation queue." }, 502)
  const reports = (await res.json().catch(() => [])) as ReportRow[]
  return json({ status, reports })
}

/** Moderator-only status move. Every move appends an immutable audit event. */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to moderate reports." }, 401)
  if (!(await requireModerator(auth.user.id))) {
    return json({ error: "Moderator access required." }, 403)
  }

  const body = await readJson(request)
  const id = typeof body?.id === "string" ? body.id : null
  const to = body?.to as ReportStatus
  const note = cleanDetails(body?.note, 1000)
  if (!id) return json({ error: "Provide a report id." }, 400)
  if (!to || !(REPORT_STATUSES as readonly string[]).includes(to)) {
    return json({ error: "Provide a valid target status." }, 400)
  }

  const current = await serviceRest(`resource_reports?select=id,status&id=eq.${encodeURIComponent(id)}&limit=1`)
  if (!current.ok) return json({ error: "Could not load the report." }, 502)
  const [row] = (await current.json().catch(() => [])) as Pick<ReportRow, "id" | "status">[]
  if (!row) return json({ error: "Report not found." }, 404)

  const move = transition(row.status, to)
  if (!move.ok) return json({ error: move.error }, 409)

  const updated = await serviceRest(`resource_reports?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: to, ...(to === "resolved" || to === "dismissed" ? { resolution: note } : {}) }),
  })
  if (!updated.ok) return json({ error: "Could not update the report." }, 502)

  await serviceRest("resource_moderation_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ report_id: id, actor_id: auth.user.id, action: move.action, ...(note ? { note } : {}) }),
  })

  return json({ id, status: to })
}

/** Guard for accidental misuse of the transition table outside this route. */
export { canTransition }
