import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { getAuthContext, serviceRest, userRest } from "@/lib/supabase-auth"
import { isResourceReviewer } from "@/lib/resource-corrections-server"
import { REPORT_STATUSES, cleanDetails, hoursObservation, isReportReason, isValidResourceRef } from "@/lib/resource-moderation"

export const dynamic = "force-dynamic"
const unavailable = () => json({ error: "Resource review is unavailable until database setup is complete." }, 503)

/** Reports stay private and never directly replace listing information. DB trigger enforces the shared rate limit. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to file a report." }, 401)
  const body = await readJson(request)
  const ref = body?.resourceRef
  const reason = body?.reason
  const details = cleanDetails(body?.details)
  if (!isValidResourceRef(ref) || !isReportReason(reason) || !details) return json({ error: "Provide a resource reference, reason and report details." }, 400)
  const observation = body?.reportType === "hours" ? hoursObservation(body) : null
  if (body?.reportType === "hours" && !observation) return json({ error: "Provide the observed time with timezone and what hours you found." }, 400)
  try {
    // Probe schema before accepting a report, so setup failures cannot silently drop structured evidence.
    const ready = await serviceRest("resource_reviewers?select=user_id&limit=0")
    if (!ready.ok) return unavailable()
    const insert = await serviceRest("rpc/resource_report_submit", { method: "POST", body: JSON.stringify({ actor: auth.user.id, resource_ref_value: ref.trim(), reason_value: reason, details_value: details, observation }) })
    if (!insert.ok) {
      const error = await insert.json().catch(() => ({})) as { code?: string }
      return error.code === "P0001" ? json({ error: "Too many reports. Try again in an hour." }, 429) : unavailable()
    }
    const row = await insert.json() as { id: string }
    if (!row?.id) return unavailable()
    return json({ id: row.id, status: "open" }, 201)
  } catch { return unavailable() }
}

/** Own status is available to the submitter; private queue is restricted to appointed reviewers. */
export async function GET(request: Request) {
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to view report status." }, 401)
  const params = new URL(request.url).searchParams
  const own = params.get("own") === "true"
  try {
    if (!own && !(await isResourceReviewer(auth.user.id))) return json({ error: "Reviewer access required." }, 403)
    const status = params.get("status") ?? "open"
    if (!(REPORT_STATUSES as readonly string[]).includes(status)) return json({ error: "Provide a valid status filter." }, 400)
    const path = `resource_reports?select=id,resource_ref,reason,details,status,resolution,observed_at,observed_timezone,observed_hours,created_at&${own ? `reporter_id=eq.${encodeURIComponent(auth.user.id)}` : `status=eq.${status}`}&order=created_at.desc&limit=100`
    const res = own ? await userRest(auth.accessToken, path) : await serviceRest(path)
    if (!res.ok) return unavailable()
    return json({ reports: await res.json() })
  } catch { return unavailable() }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to review reports." }, 401)
  const body = await readJson(request)
  const id = cleanDetails(body?.id, 100)
  const to = body?.to
  const note = cleanDetails(body?.note, 1000)
  if (!id || typeof to !== "string" || !(REPORT_STATUSES as readonly string[]).includes(to) || (["resolved", "dismissed"].includes(to) && !note)) return json({ error: "Provide the report, status and reason for the decision." }, 400)
  try {
    const response = await serviceRest("rpc/resource_report_decide", { method: "POST", body: JSON.stringify({ actor: auth.user.id, report_id: id, target_status: to, reason_value: note }) })
    if (!response.ok) {
      const error = await response.json().catch(() => ({})) as { code?: string }
      if (error.code === "42501") return json({ error: "Authorized independent reviewer required." }, 403)
      if (error.code === "23505") return json({ error: "The report changed; reload its current status." }, 409)
      return unavailable()
    }
    return json(await response.json())
  } catch { return unavailable() }
}
