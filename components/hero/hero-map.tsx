"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { MapPin, Navigation, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HERO_RESOURCE_LABELS, cellKey, cellOf, type HeroResourceKind } from "@/lib/hero-alerts"

type MapCell = {
  cell: string
  lat: number
  lon: number
  emergencyHeroes: number
  totalHeroes: number
  resources: HeroResourceKind[]
}

type MapResponse = {
  live?: boolean
  online?: number
  nearby?: number
  cells?: MapCell[]
  note?: string
  reason?: string
  error?: string
}

export function HeroMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null)
  const [locationNote, setLocationNote] = useState<string>()
  const [data, setData] = useState<MapResponse>({ cells: [] })

  const loadMap = async (latitude: number, longitude: number) => {
    try {
      const coarse = cellOf(latitude, longitude)
      if (!coarse) throw new Error("Location could not be converted to a nearby area.")
      const response = await fetch(`/api/heroes/map?cell=${encodeURIComponent(cellKey(coarse))}`, { cache: "no-store" })
      const body = await response.json() as MapResponse
      setData(body)
      setLocationNote(body.error ?? body.reason ?? body.note)
    } catch {
      setLocationNote("Hero map could not be reached.")
    }
  }

  const showMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setLocationNote("Location is unavailable in this browser.")
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { latitude: position.coords.latitude, longitude: position.coords.longitude, accuracy: position.coords.accuracy }
        setUserLocation(next)
        setLocationNote("Your location is used for this nearby lookup. Only coarse Hero areas are returned.")
        void loadMap(next.latitude, next.longitude)
      },
      () => setLocationNote("Location permission was not given."),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    )
  }

  const cells = useMemo(() => data.cells ?? [], [data.cells])

  useEffect(() => {
    const canvas = canvasRef.current
    const user = userLocation
    if (!canvas || !user) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const pixelsPerDegree = 1600

    ctx.fillStyle = "rgba(10, 15, 30, 1)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = "rgba(0, 217, 255, 0.12)"
    ctx.lineWidth = 1
    for (let i = -6; i <= 6; i++) {
      ctx.beginPath(); ctx.moveTo(centerX + i * 50, 0); ctx.lineTo(centerX + i * 50, canvas.height); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, centerY + i * 50); ctx.lineTo(canvas.width, centerY + i * 50); ctx.stroke()
    }

    ctx.beginPath()
    ctx.arc(centerX, centerY, 8, 0, Math.PI * 2)
    ctx.fillStyle = "#00d9ff"
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.font = "12px monospace"
    ctx.fillText("You", centerX + 12, centerY - 10)

    cells.forEach((cell, index) => {
      const x = centerX + (cell.lon - user.longitude) * pixelsPerDegree
      const y = centerY - (cell.lat - user.latitude) * pixelsPerDegree
      ctx.beginPath()
      ctx.arc(x, y, 9, 0, Math.PI * 2)
      ctx.fillStyle = cell.emergencyHeroes > 0 ? "#ff6464" : "#64ff64"
      ctx.fill()
      ctx.fillStyle = "#ffffff"
      ctx.font = "11px monospace"
      ctx.fillText(`${cell.totalHeroes} Hero${cell.totalHeroes === 1 ? "" : "es"}`, x + 13, y - 3)
      if (index < 6 && cell.resources.length > 0) ctx.fillText(cell.resources.slice(0,2).map((r)=>HERO_RESOURCE_LABELS[r]).join(", "), x + 13, y + 12)
    })
  }, [cells, userLocation])

  return (
    <div className="space-y-4" data-testid="hero-map">
      <div className="relative glass rounded-lg overflow-hidden neon-border">
        <canvas ref={canvasRef} width={800} height={600} className="w-full h-auto min-h-72" aria-label="Coarse Hero resource availability map" />
        <div className="absolute top-4 right-4 glass p-3 rounded-lg space-y-2 max-w-56">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary" /><span className="text-xs">You</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500" /><span className="text-xs">Community-resource Hero area</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs">Emergency-ready Hero area</span></div>
        </div>
        <div className="absolute bottom-4 left-4 glass p-3 rounded-full"><Navigation className="w-6 h-6 text-primary" /></div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={showMyLocation}>Find live Heroes and resources near me</Button>
        {userLocation && <Button type="button" variant="ghost" onClick={() => { setUserLocation(null); setData({ cells: [] }); setLocationNote("Your location was removed from this map view.") }}>Hide my location</Button>}
        {userLocation && <Button type="button" variant="ghost" onClick={() => void loadMap(userLocation.latitude, userLocation.longitude)}>Refresh</Button>}
      </div>

      {locationNote && <p className="text-xs text-muted-foreground" role="status">{locationNote}</p>}
      {!data.live && data.reason && <p className="text-xs text-amber-200">{data.reason}</p>}

      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-3 rounded-lg text-center">
          <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg font-bold">{data.online ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Available network-wide</p>
        </div>
        <div className="glass p-3 rounded-lg text-center">
          <MapPin className="w-5 h-5 mx-auto mb-1 text-secondary" />
          <p className="text-lg font-bold">{data.nearby ?? "—"}</p>
          <p className="text-xs text-muted-foreground">Nearby in coarse areas</p>
        </div>
      </div>

      {cells.length > 0 && <div className="space-y-2" data-testid="hero-map-resources">
        <h4 className="font-semibold">Resources currently offered nearby</h4>
        {cells.map((cell) => <div key={cell.cell} className="border rounded p-3 text-sm">
          <strong>{cell.totalHeroes} available Hero{cell.totalHeroes === 1 ? "" : "es"} in this approximate area</strong>
          {cell.emergencyHeroes > 0 && <span className="block text-red-300">{cell.emergencyHeroes} emergency-ready</span>}
          <span className="block text-muted-foreground">{cell.resources.length ? cell.resources.map((resource)=>HERO_RESOURCE_LABELS[resource]).join(" · ") : "Emergency assistance only"}</span>
        </div>)}
      </div>}

      <p className="text-xs text-muted-foreground">Markers are approximate area centers, not volunteer homes or exact positions. Availability can change at any time and is not guaranteed.</p>
    </div>
  )
}
