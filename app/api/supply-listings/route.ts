import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { getAuthContext, serviceRest, userRest } from "@/lib/supabase-auth"
import {
  SUPPLY_STATUSES,
  canTransitionListing,
  isModerationRole,
  isSupplyKind,
  listingRef,
  roleFor,
  validateListingInput,
  type SupplyStatus,
} from "@/lib/supply-exchange"

export const dynamic = "force-dynamic"

type ListingRow = {
  id: string
  owner_id: string
  kind: string
  title: string
  description: string
  condition: string | null
  quantity: number
  location_label: string
  provenance: string
  status: SupplyStatus
  claimed_by: string | null
  created_at: string
  updated_at: string
}

const BOARD_LIMIT = 100

async function requireModerator(userId: string): Promise<boolean> {
  const res = await serviceRest(`users?select=role&auth_user_id=eq.${encodeURIComponent(userId)}&limit=1`)
  if (!res.ok) return false
  const rows = (await res.json().catch(() => [])) as { role: string | null }[]
  return rows.length > 0 && isModerationRole(rows[0].role)
}

/** Board view: open listings, newest first, kind filter, bounded limit. */
export async function GET(request: Request) {
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to view the supply board." }, 401)

  const params = new URL(request.url).searchParams
  const kind = params.get("kind")
  const limit = Math.min(Math.max(Number(params.get("limit") ?? BOARD_LIMIT) || BOARD_LIMIT, 1), BOARD_LIMIT)

  let query = `supply_listings?status=eq.open&select=id,owner_id,kind,title,description,condition,quantity,location_label,provenance,status,claimed_by,created_at,updated_at&order=created_at.desc&limit=${limit}`
  if (kind !== null) {
    if (!isSupplyKind(kind)) return json({ error: "Unknown listing kind." }, 400)
    query = `supply_listings?status=eq.open&kind=eq.${encodeURIComponent(kind)}&select=id,owner_id,kind,title,description,condition,quantity,location_label,provenance,status,claimed_by,created_at,updated_at&order=created_at.desc&limit=${limit}`
  }

  const res = await userRest(auth.accessToken, query)
  if (!res.ok) return json({ error: "Could not load the supply board." }, 502)
  const rows = (await res.json().catch(() => [])) as ListingRow[]
  return json({ listings: rows }, 200)
}

/** Post a listing. Input is fully validated in the pure lib; RLS binds owner. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to post a listing." }, 401)

  const body = await readJson(request)
  const validation = validateListingInput({
    kind: body?.kind,
    title: body?.title,
    description: body?.description,
    condition: body?.condition,
    quantity: body?.quantity,
    locationLabel: body?.locationLabel,
    provenance: body?.provenance,
  })
  if (!validation.ok) return json({ error: validation.errors.join(" ") }, 400)
  const value = validation.value

  const insert = await userRest(auth.accessToken, "supply_listings", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      owner_id: auth.user.id,
      kind: value.kind,
      title: value.title,
      description: value.description,
      condition: value.condition,
      quantity: value.quantity,
      location_label: value.locationLabel,
      provenance: value.provenance,
    }),
  })
  if (!insert.ok) return json({ error: "Could not post the listing." }, 502)
  const [row] = (await insert.json().catch(() => [])) as Pick<ListingRow, "id">[]
  if (!row?.id) return json({ error: "Could not post the listing." }, 502)
  return json({ id: row.id, ref: listingRef(row.id) }, 201)
}

/**
 * Status moves. The database claim/release/owner policies enforce the same
 * rules as `canTransitionListing`; the lib check exists so the route fails
 * fast with a clear error instead of a policy violation.
 *
 * Moderator takedown: closes any listing via the service role after a
 * moderator-role check. The takedown reason belongs in the moderation queue
 * (report on `supply:<id>`), which already keeps its own audit trail.
 */
export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to update a listing." }, 401)

  const body = await readJson(request)
  const id = typeof body?.id === "string" ? body.id : null
  const to = typeof body?.status === "string" ? body.status : null
  if (!id) return json({ error: "Listing id required." }, 400)
  if (!to || !(SUPPLY_STATUSES as readonly string[]).includes(to)) {
    return json({ error: "Target status must be open, claimed, or closed." }, 400)
  }

  const current = await userRest(auth.accessToken, `supply_listings?id=eq.${encodeURIComponent(id)}&select=id,owner_id,status,claimed_by&limit=1`)
  if (!current.ok) return json({ error: "Could not load the listing." }, 502)
  const [row] = (await current.json().catch(() => [])) as Array<Pick<ListingRow, "id" | "owner_id" | "status" | "claimed_by">>
  if (!row) return json({ error: "Listing not found." }, 404)

  const isModerator = await requireModerator(auth.user.id)
  const role = roleFor(auth.user.id, { owner_id: row.owner_id, claimed_by: row.claimed_by }, isModerator ? new Set([auth.user.id]) : undefined)
  if (!canTransitionListing(row.status, to as SupplyStatus, role)) {
    return json({ error: `Cannot move a listing from ${row.status} to ${to} as ${role}.` }, 409)
  }

  const patch: Record<string, unknown> = { status: to }
  if (row.status === "open" && to === "claimed") patch.claimed_by = auth.user.id
  if (row.status === "claimed" && to === "open") patch.claimed_by = null

  const update = isModerator && to === "closed"
    ? await serviceRest(`supply_listings?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify({ status: "closed" }),
      })
    : await userRest(auth.accessToken, `supply_listings?id=eq.${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      })
  if (!update.ok) return json({ error: "Could not update the listing." }, 502)
  return json({ id, status: to }, 200)
}
