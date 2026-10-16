import { isSameOrigin, json, readJson } from "@/lib/api-helpers"
import { getAuthContext, userRest } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

const cleanText = (value: unknown, max: number) =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : ""

const validHandle = (value: unknown) => {
  const handle = typeof value === "string" ? value.trim().toLowerCase() : ""
  return /^[a-z0-9_]{3,24}$/.test(handle) ? handle : null
}

async function rows<T>(response: Response): Promise<T[]> {
  return response.ok ? await response.json() as T[] : []
}

type Profile = { auth_user_id: string; handle: string; display_name: string; bio: string; created_at: string }
type Post = { id: string; author_id: string; body: string; category: string; created_at: string }
type Connection = { id: string; requester_id: string; addressee_id: string; status: "pending" | "accepted"; created_at: string }
type Message = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string; read_at: string | null }

export async function GET() {
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ authenticated: false, profile: null, profiles: [], posts: [], connections: [], messages: [] })

  const [profileRes, profilesRes, postsRes, connectionsRes, messagesRes] = await Promise.all([
    userRest(auth.accessToken, `community_profiles?select=auth_user_id,handle,display_name,bio,created_at&auth_user_id=eq.${encodeURIComponent(auth.user.id)}`),
    userRest(auth.accessToken, "community_profiles?select=auth_user_id,handle,display_name,bio,created_at&order=created_at.desc&limit=50"),
    userRest(auth.accessToken, "community_posts?select=id,author_id,body,category,created_at&deleted_at=is.null&order=created_at.desc&limit=50"),
    userRest(auth.accessToken, `community_connections?select=id,requester_id,addressee_id,status,created_at&or=(requester_id.eq.${auth.user.id},addressee_id.eq.${auth.user.id})&order=created_at.desc`),
    userRest(auth.accessToken, `community_messages?select=id,sender_id,recipient_id,body,created_at,read_at&or=(sender_id.eq.${auth.user.id},recipient_id.eq.${auth.user.id})&order=created_at.asc&limit=100`),
  ])

  const [profile] = await rows<Profile>(profileRes)
  return json({
    authenticated: true,
    userId: auth.user.id,
    profile: profile ?? null,
    profiles: await rows<Profile>(profilesRes),
    posts: await rows<Post>(postsRes),
    connections: await rows<Connection>(connectionsRes),
    messages: await rows<Message>(messagesRes),
  })
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Cross-origin request rejected" }, 403)
  const auth = await getAuthContext().catch(() => null)
  if (!auth) return json({ error: "Sign in to use the community." }, 401)
  const body = await readJson(request)
  if (!body) return json({ error: "Invalid request." }, 400)

  if (body.action === "profile") {
    const handle = validHandle(body.handle)
    const displayName = cleanText(body.displayName, 60)
    const bio = cleanText(body.bio, 500)
    if (!handle || !displayName) return json({ error: "Use a 3–24 character handle with letters, numbers, or underscores and enter a display name." }, 400)
    const response = await userRest(auth.accessToken, "community_profiles?on_conflict=auth_user_id", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ auth_user_id: auth.user.id, handle, display_name: displayName, bio, updated_at: new Date().toISOString() }),
    })
    return response.ok ? json({ saved: true }) : json({ error: response.status === 409 ? "That handle is already taken." : "Could not save the profile." }, 400)
  }

  if (body.action === "post") {
    const text = cleanText(body.body, 1000)
    const categories = new Set(["general","resource","recovery","wins","question"])
    const category = typeof body.category === "string" && categories.has(body.category) ? body.category : "general"
    if (!text) return json({ error: "Write something before posting." }, 400)
    const response = await userRest(auth.accessToken, "community_posts", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ author_id: auth.user.id, body: text, category }),
    })
    return response.ok ? json({ posted: true }) : json({ error: "Could not publish the post." }, 503)
  }

  if (body.action === "connect") {
    const handle = validHandle(body.handle)
    if (!handle) return json({ error: "Enter a valid handle." }, 400)
    const targetResponse = await userRest(auth.accessToken, `community_profiles?select=auth_user_id&handle=eq.${encodeURIComponent(handle)}`)
    const [target] = await rows<{ auth_user_id: string }>(targetResponse)
    if (!target || target.auth_user_id === auth.user.id) return json({ error: "That community profile was not found." }, 404)
    const response = await userRest(auth.accessToken, "community_connections", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ requester_id: auth.user.id, addressee_id: target.auth_user_id, status: "pending" }),
    })
    return response.ok ? json({ requested: true }) : json({ error: "A connection request may already exist." }, 409)
  }

  if (body.action === "accept") {
    if (typeof body.connectionId !== "string") return json({ error: "Connection ID is missing." }, 400)
    const response = await userRest(auth.accessToken, `community_connections?id=eq.${encodeURIComponent(body.connectionId)}&addressee_id=eq.${encodeURIComponent(auth.user.id)}&status=eq.pending`, {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ status: "accepted", updated_at: new Date().toISOString() }),
    })
    return response.ok ? json({ accepted: true }) : json({ error: "Could not accept the connection." }, 503)
  }

  if (body.action === "message") {
    const text = cleanText(body.body, 2000)
    if (typeof body.recipientId !== "string" || !text) return json({ error: "Choose a connection and write a message." }, 400)
    const response = await userRest(auth.accessToken, "community_messages", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ sender_id: auth.user.id, recipient_id: body.recipientId, body: text }),
    })
    return response.ok ? json({ sent: true }) : json({ error: "Messages are allowed only between accepted, unblocked connections." }, 403)
  }

  if (body.action === "block") {
    if (typeof body.userId !== "string" || body.userId === auth.user.id) return json({ error: "Invalid user." }, 400)
    const response = await userRest(auth.accessToken, "community_blocks", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ blocker_id: auth.user.id, blocked_id: body.userId }),
    })
    return response.ok ? json({ blocked: true }) : json({ error: "Could not block that account." }, 503)
  }

  return json({ error: "Unknown action." }, 400)
}
