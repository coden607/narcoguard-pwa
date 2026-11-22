"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import { Box, ImageIcon, Smartphone } from "lucide-react"
import { chooseShowcaseMode, tiltFromOrientation, tiltFromPointer, type ShowcaseMode } from "@/lib/showcase-mode"
import type { HoloWatchScene } from "./holo-watch-scene"

type View = "3d" | "render"
type Status = "idle" | "loading" | "ready" | "fallback"

interface Props {
  /** Heading shown above the stage. */
  title?: string
  className?: string
  /** Use the larger stage on landing sections. */
  size?: "hero" | "compact"
  /** Public concept render shown first and used whenever 3D is off. */
  imageSrc?: string
  /** Mark the render as the page's largest image so it is fetched first. */
  priority?: boolean
  /** Heading element for the title; use "p" when the showcase sits above the page's h1. */
  titleAs?: "h2" | "p"
}

type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> }

function probeWebGL(): { webgl: boolean; renderer?: string } {
  try {
    const c = document.createElement("canvas")
    const gl = (c.getContext("webgl2") || c.getContext("webgl")) as WebGLRenderingContext | null
    if (!gl) return { webgl: false }
    const info = gl.getExtension("WEBGL_debug_renderer_info")
    const renderer = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER))
    gl.getExtension("WEBGL_lose_context")?.loseContext()
    return { webgl: true, renderer }
  } catch {
    return { webgl: false }
  }
}

/** `?hologram=force` shows the 3D scene even on software rendering (demos and screenshots); WebGL is still required. */
const forced = () => new URLSearchParams(location.search).get("hologram") === "force"

function detectMode(): ShowcaseMode {
  if (forced()) return probeWebGL().webgl ? "3d" : "image"
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number }
  const gl = probeWebGL()
  return chooseShowcaseMode({
    webgl: gl.webgl,
    renderer: gl.renderer,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    saveData: nav.connection?.saveData === true,
    cores: nav.hardwareConcurrency,
    memoryGb: nav.deviceMemory,
  })
}

const HERO_RENDER = "/images/ng-rev5-hero-titanium.jpg?rev=titanium-solar-2026-11-18"

const currentTheme = () => (document.documentElement.classList.contains("dark") ? "dark" : "light")

/**
 * Holographic, see-through NG concept watch. Server-renders the public concept render, then (only
 * when WebGL is available, motion is allowed, the device is not low-power and the stage is on
 * screen) lazy-loads a three.js glass hologram. Simplified shapes only; not an engineering model.
 */
export function HoloWatchShowcase({ title = "NarcoGuard NG concept", className = "", size = "hero", imageSrc = HERO_RENDER, priority = false, titleAs: TitleTag = "h2" }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<HoloWatchScene | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [view, setView] = useState<View>("3d")
  const [motionAllowed, setMotionAllowed] = useState(false)
  const [needsMotionPermission, setNeedsMotionPermission] = useState(false)

  const applyTilt = useCallback((rx: number, ry: number) => {
    stageRef.current?.style.setProperty("--holo-rx", `${rx}deg`)
    stageRef.current?.style.setProperty("--holo-ry", `${ry}deg`)
    sceneRef.current?.setTilt(rx, ry)
  }, [])

  // Decide 3D vs image, then load three.js only once the stage is visible and the browser is idle.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const mode = detectMode()
    /* eslint-disable react-hooks/set-state-in-effect -- capability probe can only run in the browser */
    setMotionAllowed(!matchMedia("(prefers-reduced-motion: reduce)").matches)
    setNeedsMotionPermission(matchMedia("(pointer: coarse)").matches && typeof (globalThis.DeviceOrientationEvent as unknown as OrientationPermission | undefined)?.requestPermission === "function")
    if (mode === "image") { setStatus("fallback"); return }
    /* eslint-enable react-hooks/set-state-in-effect */
    let cancelled = false
    let idleId: number | undefined
    const load = () => {
      if (cancelled || sceneRef.current) return
      setStatus("loading")
      import("./holo-watch-scene")
        .then(({ createHoloWatchScene }) => {
          if (cancelled || !canvasRef.current) return
          sceneRef.current = createHoloWatchScene(canvasRef.current, currentTheme(), forced() ? undefined : () => {
            // The device cannot hold a smooth frame rate: free the GPU and keep the static render.
            sceneRef.current?.dispose()
            sceneRef.current = null
            if (!cancelled) setStatus("fallback")
          })
          setStatus("ready")
        })
        .catch(() => { if (!cancelled) setStatus("fallback") })
    }
    const io = new IntersectionObserver((entries) => {
      const visible = entries.some((e) => e.isIntersecting)
      if (visible && !sceneRef.current) {
        const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback
        if (ric) idleId = ric(load, { timeout: 2500 })
        else idleId = window.setTimeout(load, 600)
      }
      sceneRef.current?.setActive(visible && document.visibilityState === "visible")
    }, { rootMargin: "120px" })
    io.observe(stage)
    const onVisibility = () => sceneRef.current?.setActive(document.visibilityState === "visible")
    document.addEventListener("visibilitychange", onVisibility)
    const themeObserver = new MutationObserver(() => sceneRef.current?.setTheme(currentTheme()))
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    const onResize = () => sceneRef.current?.resize()
    window.addEventListener("resize", onResize)
    return () => {
      cancelled = true
      if (idleId !== undefined) {
        const cic = (window as Window & { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback
        if (cic) cic(idleId)
        else clearTimeout(idleId)
      }
      io.disconnect()
      themeObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("resize", onResize)
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [])

  // Device tilt (Android and desktop sensors fire without a prompt; iOS needs the button below).
  useEffect(() => {
    if (!motionAllowed || needsMotionPermission) return
    const onOrient = (e: DeviceOrientationEvent) => { const t = tiltFromOrientation(e.beta, e.gamma); applyTilt(t.rx, t.ry) }
    window.addEventListener("deviceorientation", onOrient)
    return () => window.removeEventListener("deviceorientation", onOrient)
  }, [motionAllowed, needsMotionPermission, applyTilt])

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!motionAllowed || e.pointerType === "touch") return
    const r = e.currentTarget.getBoundingClientRect()
    const t = tiltFromPointer(e.clientX - r.left, e.clientY - r.top, r.width, r.height)
    applyTilt(t.rx, t.ry)
  }

  const enableDeviceTilt = async () => {
    const req = (globalThis.DeviceOrientationEvent as unknown as OrientationPermission | undefined)?.requestPermission
    if (!req) return
    try {
      if ((await req()) === "granted") setNeedsMotionPermission(false)
    } catch { /* the person declined; pointer tilt still works */ }
  }

  const show3d = status === "ready" && view === "3d"
  const mode = status === "fallback" ? "image" : status === "ready" ? (view === "3d" ? "3d" : "image") : "loading"

  return (
    <figure className={`holo-showcase holo-showcase--${size} ${className}`} data-testid="holo-showcase" data-showcase-mode={mode}>
      <div className="holo-showcase-head">
        <TitleTag className="holo-title font-orbitron">{title}</TitleTag>
        <div className="holo-showcase-controls">
          {status === "ready" && (
            <button type="button" className="holo-chip" onClick={() => setView(view === "3d" ? "render" : "3d")} aria-pressed={view === "render"} data-testid="holo-view-toggle">
              {view === "3d" ? <ImageIcon aria-hidden="true" /> : <Box aria-hidden="true" />}
              {view === "3d" ? "Show concept render" : "Show 3D hologram"}
            </button>
          )}
          {needsMotionPermission && motionAllowed && (
            <button type="button" className="holo-chip" onClick={enableDeviceTilt}>
              <Smartphone aria-hidden="true" />Tilt with phone
            </button>
          )}
        </div>
      </div>
      <div
        ref={stageRef}
        className="holo-stage"
        onPointerMove={onPointerMove}
        onPointerLeave={() => applyTilt(0, 0)}
      >
        <div className="holo-tilt">
          <div className={`holo-render ${show3d ? "is-hidden" : ""}`}>
            <Image
              src={imageSrc}
              priority={priority}
              alt="Concept render of the NarcoGuard NG watch in titanium and rose finishes"
              width={1280}
              height={720}
              sizes="(max-width: 768px) 100vw, 56rem"
              className="holo-render-img"
            />
          </div>
          <canvas
            ref={canvasRef}
            className={`holo-canvas ${show3d ? "is-visible" : ""}`}
            role="img"
            aria-label="Interactive see-through 3D hologram of the NarcoGuard NG concept watch. Simplified shapes, not to scale."
            data-testid="holo-canvas"
          />
          <div className="holo-iridescence" aria-hidden="true" />
          <div className="holo-scanlines" aria-hidden="true" />
          <div className="holo-hud" aria-hidden="true"><span /><span /><span /><span /></div>
        </div>
        <div className="holo-floor" aria-hidden="true" />
        {status === "loading" && <p className="holo-status" role="status">Loading 3D hologram…</p>}
      </div>
      <figcaption className="holo-caption">
        Concept render and simplified 3D illustration, not to scale. The NG watch is in development and is not a medical device; it shows no live data.
      </figcaption>
    </figure>
  )
}
