// Holographic, see-through NarcoGuard NG concept watch for the marketing showcase.
// Built only from simplified primitives (rings, discs, rounded links). It is deliberately NOT the
// engineering model: no real dimensions, components or part data. Loaded with a dynamic import so
// three.js never touches the first paint or any emergency screen.
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { framesTooSlow } from "@/lib/showcase-mode"

export interface HoloWatchScene {
  setTilt: (rx: number, ry: number) => void
  setTheme: (theme: "dark" | "light") => void
  setActive: (active: boolean) => void
  resize: () => void
  dispose: () => void
}

const DEG = Math.PI / 180

function faceTexture(): THREE.CanvasTexture {
  const size = 512
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const ctx = canvas.getContext("2d")!
  const c = size / 2
  const bg = ctx.createRadialGradient(c, c, 10, c, c, c)
  bg.addColorStop(0, "rgba(8,20,36,0.92)")
  bg.addColorStop(1, "rgba(2,6,14,0.96)")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, size, size)
  // Index ring
  ctx.save()
  ctx.translate(c, c)
  for (let i = 0; i < 60; i++) {
    ctx.rotate(Math.PI / 30)
    ctx.fillStyle = i % 5 === 4 ? "rgba(165,243,252,0.95)" : "rgba(103,232,249,0.35)"
    ctx.fillRect(-2, -c * 0.93, 4, i % 5 === 4 ? 26 : 12)
  }
  ctx.restore()
  // Iridescent arc
  const arc = ctx.createLinearGradient(0, 0, size, size)
  arc.addColorStop(0, "#22d3ee")
  arc.addColorStop(0.5, "#a855f7")
  arc.addColorStop(1, "#f472b6")
  ctx.strokeStyle = arc
  ctx.lineWidth = 10
  ctx.lineCap = "round"
  ctx.beginPath()
  ctx.arc(c, c, c * 0.7, -Math.PI * 0.8, Math.PI * 0.2)
  ctx.stroke()
  ctx.textAlign = "center"
  ctx.fillStyle = "#e0f7ff"
  ctx.font = "700 34px system-ui, sans-serif"
  ctx.fillText("NARCOGUARD", c, c - 28)
  ctx.fillStyle = "#67e8f9"
  ctx.font = "600 22px system-ui, sans-serif"
  ctx.fillText("NG CONCEPT", c, c + 14)
  ctx.fillStyle = "#fbbf24"
  ctx.font = "600 18px system-ui, sans-serif"
  ctx.fillText("NO LIVE DATA", c, c + 56)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export function createHoloWatchScene(canvas: HTMLCanvasElement, initialTheme: "dark" | "light", onTooSlow?: () => void): HoloWatchScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.1

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  scene.environment = envTex

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
  camera.position.set(0, 0.25, 7.2)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const key = new THREE.DirectionalLight(0xffffff, 1.6)
  key.position.set(3, 4, 5)
  scene.add(key)
  const cyan = new THREE.PointLight(0x22d3ee, 18, 12)
  const magenta = new THREE.PointLight(0xd946ef, 14, 12)
  scene.add(cyan, magenta)

  const disposables: { dispose: () => void }[] = [envTex, pmrem]
  const track = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x }

  const watch = new THREE.Group()
  scene.add(watch)

  // Glass case: physically based transmission with thin-film iridescence.
  const glassCase = track(new THREE.MeshPhysicalMaterial({
    color: 0xcfe8ff, metalness: 0, roughness: 0.06, transmission: 1, thickness: 0.8, ior: 1.45,
    iridescence: 1, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 620], clearcoat: 1, clearcoatRoughness: 0.05,
    transparent: true, opacity: 0.95, side: THREE.DoubleSide,
  }))
  const titanium = track(new THREE.MeshPhysicalMaterial({
    color: 0xb9c3cc, metalness: 1, roughness: 0.22, iridescence: 0.55, iridescenceIOR: 1.6, clearcoat: 0.6,
  }))
  const caseMesh = new THREE.Mesh(track(new THREE.CylinderGeometry(1.12, 1.12, 0.36, 96, 1, true)), glassCase)
  caseMesh.rotation.x = Math.PI / 2
  watch.add(caseMesh)
  const bezel = new THREE.Mesh(track(new THREE.TorusGeometry(1.12, 0.075, 32, 160)), titanium)
  bezel.position.z = 0.18
  watch.add(bezel)
  const backRing = new THREE.Mesh(track(new THREE.TorusGeometry(1.1, 0.05, 24, 160)), titanium)
  backRing.position.z = -0.18
  watch.add(backRing)

  const faceTex = track(faceTexture())
  const face = new THREE.Mesh(track(new THREE.CircleGeometry(1.02, 96)), track(new THREE.MeshBasicMaterial({ map: faceTex, toneMapped: false })))
  face.position.z = 0.05
  watch.add(face)
  const crystal = new THREE.Mesh(track(new THREE.CircleGeometry(1.08, 96)), glassCase)
  crystal.position.z = 0.2
  watch.add(crystal)

  const crown = new THREE.Mesh(track(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 32)), titanium)
  crown.rotation.z = Math.PI / 2
  crown.position.set(1.26, 0.12, 0)
  watch.add(crown)

  // Bracelet: simplified rounded links arcing away from the case, glass with holographic edges.
  const edgeMat = track(new THREE.LineBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.7 }))
  const linkGeo = track(new THREE.BoxGeometry(1.1, 0.34, 0.14, 1, 1, 1))
  const linkEdges = track(new THREE.EdgesGeometry(linkGeo))
  const LINK_PITCH = 0.4
  const ARC_R = 1.9
  for (const dir of [1, -1]) {
    for (let i = 0; i < 7; i++) {
      const a = ((i + 0.5) * LINK_PITCH) / ARC_R
      const link = new THREE.Mesh(linkGeo, glassCase)
      link.position.set(0, dir * (1.02 + ARC_R * Math.sin(a)), -ARC_R * (1 - Math.cos(a)) - 0.04)
      link.rotation.x = -dir * a
      link.add(new THREE.LineSegments(linkEdges, edgeMat))
      watch.add(link)
    }
  }

  // Holographic halo: additive orbit rings and a drifting particle shell.
  const ringMat = track(new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }))
  const ringMat2 = track(new THREE.MeshBasicMaterial({ color: 0xc084fc, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }))
  const ringA = new THREE.Mesh(track(new THREE.TorusGeometry(1.75, 0.008, 8, 200)), ringMat)
  const ringB = new THREE.Mesh(track(new THREE.TorusGeometry(2.05, 0.006, 8, 200)), ringMat2)
  ringA.rotation.x = 72 * DEG
  ringB.rotation.x = 105 * DEG
  ringB.rotation.y = 20 * DEG
  scene.add(ringA, ringB)

  const count = 420
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    // Deterministic golden-angle sphere: decorative only.
    const t = (i + 0.5) / count
    const inc = Math.acos(1 - 2 * t)
    const az = Math.PI * (1 + Math.sqrt(5)) * i
    const r = 2.4 + ((i * 37) % 11) / 30
    pos[i * 3] = r * Math.sin(inc) * Math.cos(az)
    pos[i * 3 + 1] = r * Math.cos(inc)
    pos[i * 3 + 2] = r * Math.sin(inc) * Math.sin(az)
  }
  const ptsGeo = track(new THREE.BufferGeometry())
  ptsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3))
  const ptsMat = track(new THREE.PointsMaterial({ color: 0x67e8f9, size: 0.025, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }))
  const points = new THREE.Points(ptsGeo, ptsMat)
  scene.add(points)

  // Scan plane sweeping through the watch.
  const scanMat = track(new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))
  const scan = new THREE.Mesh(track(new THREE.PlaneGeometry(3.4, 0.03)), scanMat)
  scan.position.z = 0.25
  scene.add(scan)

  function setTheme(theme: "dark" | "light") {
    const dark = theme === "dark"
    edgeMat.color.set(dark ? 0x67e8f9 : 0x0e7490)
    ringMat.color.set(dark ? 0x22d3ee : 0x0891b2)
    ringMat2.color.set(dark ? 0xc084fc : 0x7c3aed)
    ptsMat.color.set(dark ? 0x67e8f9 : 0x0e7490)
    // Additive glow vanishes on white; light theme uses normal blending instead.
    for (const m of [ringMat, ringMat2, ptsMat, scanMat]) { m.blending = dark ? THREE.AdditiveBlending : THREE.NormalBlending; m.needsUpdate = true }
    renderer.toneMappingExposure = dark ? 1.1 : 0.95
  }
  setTheme(initialTheme)

  const target = { rx: 0, ry: 0 }
  let active = true
  let raf = 0
  let last = performance.now()
  let spin = -25 * DEG

  function resize() {
    const w = canvas.clientWidth || 1
    const h = canvas.clientHeight || 1
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.position.z = w / h < 0.8 ? 9 : 7.2
    camera.updateProjectionMatrix()
  }
  resize()

  const frameMs: number[] = []
  let watchdog = Boolean(onTooSlow)
  function frame(now: number) {
    raf = requestAnimationFrame(frame)
    if (watchdog) {
      frameMs.push(now - last)
      if (framesTooSlow(frameMs)) { watchdog = false; cancelAnimationFrame(raf); onTooSlow?.(); return }
      if (frameMs.length >= 90) watchdog = false
    }
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    const t = now / 1000
    spin += dt * 0.35
    watch.rotation.y += (Math.sin(spin) * 0.6 + target.ry * DEG - watch.rotation.y) * Math.min(1, dt * 4)
    watch.rotation.x += (target.rx * DEG + 0.12 - watch.rotation.x) * Math.min(1, dt * 4)
    watch.position.y = Math.sin(t * 1.1) * 0.06
    ringA.rotation.z = t * 0.25
    ringB.rotation.z = -t * 0.18
    points.rotation.y = t * 0.05
    scan.position.y = Math.sin(t * 0.9) * 1.25
    cyan.position.set(Math.cos(t * 0.7) * 3, 1.5, Math.sin(t * 0.7) * 3)
    magenta.position.set(Math.cos(t * 0.7 + Math.PI) * 3, -1.2, Math.sin(t * 0.7 + Math.PI) * 3)
    renderer.render(scene, camera)
  }

  function setActive(on: boolean) {
    if (on === active) return
    active = on
    if (on) { last = performance.now(); raf = requestAnimationFrame(frame) }
    else cancelAnimationFrame(raf)
  }

  raf = requestAnimationFrame(frame)

  return {
    setTilt: (rx, ry) => { target.rx = rx; target.ry = ry },
    setTheme,
    setActive,
    resize,
    dispose: () => {
      cancelAnimationFrame(raf)
      for (const d of disposables) d.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
