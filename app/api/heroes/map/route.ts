import { json } from "@/lib/api-helpers"
import {
  alertsStatus,
  cellCenter,
  cellKey,
  cellOf,
  nearbyCells,
  type HeroResourceKind,
} from "@/lib/hero-alerts"
import { serviceRest } from "@/lib/supabase-auth"

export const dynamic = "force-dynamic"

type AvailabilityRow = {
  cell: string
  available_until: string
  paused: boolean
  emergency_ready?: boolean
  resource_kinds?: HeroResourceKind[]
}

export async function GET(request: Request) {
  const status = alertsStatus(process.env)
  if (!status.live) return json({ ...status, cells: [], online: 0, nearby: 0 })

  const url = new URL(request.url)
  const lat = Number(url.searchParams.get("lat"))
  const lon = Number(url.searchParams.get("lon"))
  const origin = cellOf(lat, lon)
  if (!origin) return json({ error: "A valid location is required." }, 400)

  const response = await serviceRest(
    `hero_availability?select=cell,available_until,paused,emergency_ready,resource_kinds&paused=eq.false&available_until=gt.${new Date().toISOString()}`,
  ).catch(() => null)
  if (!response?.ok) return json({ error: "Hero map is temporarily unavailable." }, 503)
  const rows = (await response.json()) as AvailabilityRow[]
  const allowed = new Set(nearbyCells(origin))
  const nearby = rows.filter((row) => allowed.has(row.cell))

  const grouped = new Map<string, { emergencyHeroes: number; resources: Set<HeroResourceKind>; totalHeroes: number }>()
  for (const row of nearby) {
    const item = grouped.get(row.cell) ?? { emergencyHeroes: 0, resources: new Set<HeroResourceKind>(), totalHeroes: 0 }
    item.totalHeroes += 1
    if (row.emergency_ready === true) item.emergencyHeroes += 1
    for (const resource of Array.isArray(row.resource_kinds) ? row.resource_kinds : []) item.resources.add(resource)
    grouped.set(row.cell, item)
  }

  return json({
    live: true,
    online: rows.length,
    nearby: nearby.length,
    cells: [...grouped.entries()].flatMap(([cell, item]) => {
      const center = cellCenter(cell)
      if (!center) return []
      return [{
        cell,
        lat: Number(center.lat.toFixed(3)),
        lon: Number(center.lon.toFixed(3)),
        emergencyHeroes: item.emergencyHeroes,
        totalHeroes: item.totalHeroes,
        resources: [...item.resources],
      }]
    }),
    note: "Map markers are coarse area centers, not volunteer addresses or exact positions.",
  })
}
