import { getAuthContext, serviceRest } from "./supabase-auth"
import { governanceHandler, type ReviewKind } from "./resource-corrections-api"

export async function reviewRoute(kind: ReviewKind, request: Request) {
  return governanceHandler(kind, request, {
    authenticate: async () => (await getAuthContext())?.user ?? null,
    execute: (operation, payload) => serviceRest("rpc/resource_governance", { method: "POST", body: JSON.stringify({ operation, payload }) }),
  })
}

/** Reviewer membership is provisioned server-side; user-editable profile roles never authorize moderation. */
export async function isResourceReviewer(userId: string): Promise<boolean> {
  const res = await serviceRest(`resource_reviewers?select=user_id&user_id=eq.${encodeURIComponent(userId)}&limit=1`).catch(() => null)
  if (!res?.ok) return false
  const rows = await res.json().catch(() => []) as { user_id: string }[]
  return rows.some(row => row.user_id === userId)
}
