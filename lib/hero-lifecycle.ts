export const HERO_REQUEST_STATUSES = [
  "open",
  "accepted",
  "en_route",
  "arrived",
  "completed",
  "cancelled",
] as const

export type HeroRequestStatus = (typeof HERO_REQUEST_STATUSES)[number]

export function isHeroRequestStatus(value: unknown): value is HeroRequestStatus {
  return typeof value === "string" && (HERO_REQUEST_STATUSES as readonly string[]).includes(value)
}

export function requesterCanCancel(status: HeroRequestStatus) {
  return status !== "completed" && status !== "cancelled"
}

export function heroCanRelease(status: HeroRequestStatus) {
  return status === "accepted" || status === "en_route"
}

export function nextHeroAction(status: HeroRequestStatus) {
  if (status === "accepted") return "en-route" as const
  if (status === "en_route") return "arrive" as const
  if (status === "arrived") return "complete" as const
  return null
}

export function requesterStatusText(status: HeroRequestStatus) {
  switch (status) {
    case "open": return "Waiting for a matching Hero"
    case "accepted": return "A Hero accepted your request"
    case "en_route": return "Your Hero marked themselves on the way"
    case "arrived": return "Your Hero marked themselves arrived"
    case "completed": return "Request completed"
    case "cancelled": return "Request cancelled"
  }
}
