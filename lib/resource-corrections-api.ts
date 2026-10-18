import { isSameOrigin, json, readJson } from "./api-helpers"
import { cleanDetails, isValidResourceRef } from "./resource-moderation"

export type ReviewKind = "correction" | "duplicate" | "appeal"
export type GovernanceDependencies = {
  authenticate: () => Promise<{ id: string } | null>
  execute: (operation: string, payload: Record<string, unknown>) => Promise<Response>
}

function sourceUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null
  try {
    const url = new URL(value)
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null
  } catch { return null }
}

/** The database RPC owns authorization and atomic state changes. No identity supplied by the browser is forwarded. */
export async function governanceHandler(kind: ReviewKind, request: Request, deps: GovernanceDependencies) {
  const write = request.method !== "GET"
  if (write && !isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const query = new URL(request.url).searchParams
  const publicRef = !write && kind === "correction" ? query.get("resourceRef") : null
  const user = publicRef ? null : await deps.authenticate().catch(() => null)
  if (!publicRef && !user) return json({ error: "Sign in to use private resource review." }, 401)
  let operation: string
  let payload: Record<string, unknown>
  if (!write) {
    if (publicRef && !isValidResourceRef(publicRef)) return json({ error: "Provide a source-scoped resource reference." }, 400)
    operation = publicRef ? "public" : "list"
    payload = publicRef ? { resourceRef: publicRef.trim() } : { actor: user!.id, kind, queue: query.get("queue") === "true" }
  } else {
    const body = await readJson(request)
    if (request.method === "PATCH") {
      const id = cleanDetails(body?.id, 100)
      const reason = cleanDetails(body?.reason, 1000)
      const action = body?.action
      if (!id || !reason || !["verify", "publish", "reject", "undo", "uphold", "overturn"].includes(String(action))) return json({ error: "Choose an action and provide the review reason." }, 400)
      operation = "decide"
      payload = { actor: user!.id, kind, id, action, reason }
    } else {
      const text = cleanDetails(body?.text)
      const ref = kind === "appeal" ? null : body?.resourceRef
      const evidence = kind === "appeal" ? null : sourceUrl(body?.sourceUrl)
      const target = kind === "duplicate" ? body?.targetRef : null
      const parent = kind === "appeal" ? cleanDetails(body?.parentId, 100) : null
      if (!text || (kind !== "appeal" && (!isValidResourceRef(ref) || !evidence)) || (kind === "appeal" && !parent) || (kind === "duplicate" && (!isValidResourceRef(target) || ref === target))) return json({ error: "Provide details, distinct source-scoped references where needed, and a public source URL." }, 400)
      operation = "submit"
      payload = { actor: user!.id, kind, resourceRef: typeof ref === "string" ? ref.trim() : ref, text, sourceUrl: evidence, targetRef: typeof target === "string" ? target.trim() : target, parentId: parent }
    }
  }
  try {
    const response = await deps.execute(operation, payload)
    const data = await response.json().catch(() => null) as Record<string, unknown> | null
    if (!response.ok) {
      const code = data?.code
      const status = code === "42501" ? 403 : code === "23505" ? 409 : code === "P0001" ? 429 : response.status === 403 ? 403 : 503
      return json({ error: status === 503 ? "Resource review is unavailable until database setup is complete." : status === 429 ? "Too many submissions. Try again later." : status === 409 ? "The review changed or this action conflicts with its current state." : "This review is private or requires an authorized independent reviewer." }, status)
    }
    return json(data, operation === "submit" ? 201 : 200)
  } catch {
    return json({ error: "Resource review is unavailable until database setup is complete." }, 503)
  }
}
