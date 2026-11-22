// Decides whether the holographic watch showcase may load its WebGL scene or must stay on the
// static concept render. Kept pure so the fallback rules are unit-tested.

export interface ShowcaseEnvironment {
  /** A WebGL context could be created. */
  webgl: boolean
  /** prefers-reduced-motion: reduce */
  reducedMotion: boolean
  /** Data Saver / Save-Data is on. */
  saveData?: boolean
  /** navigator.hardwareConcurrency, when known. */
  cores?: number
  /** navigator.deviceMemory in GB, when known. */
  memoryGb?: number
  /** Battery saver: the battery is low and not charging. */
  lowBattery?: boolean
  /** Unmasked WebGL renderer string, when the browser exposes it. */
  renderer?: string
}

/** CPU-emulated WebGL (no GPU): a glass hologram would block the main thread for seconds. */
export function isSoftwareRenderer(renderer: string | undefined): boolean {
  return typeof renderer === "string" && /swiftshader|llvmpipe|softpipe|software|basic render driver|mesa offscreen/i.test(renderer)
}

/** Frame-time watchdog: give up on 3D when the scene cannot hold roughly 20 fps. */
export function framesTooSlow(frameMs: number[], budgetMs = 50, minSamples = 20): boolean {
  if (frameMs.length < minSamples) return false
  const recent = frameMs.slice(-minSamples).slice().sort((a, b) => a - b)
  return recent[Math.floor(recent.length / 2)] > budgetMs
}

export type ShowcaseMode = "3d" | "image"

export function chooseShowcaseMode(env: ShowcaseEnvironment): ShowcaseMode {
  if (!env.webgl) return "image"
  if (isSoftwareRenderer(env.renderer)) return "image"
  if (env.reducedMotion) return "image"
  if (env.saveData) return "image"
  if (env.lowBattery) return "image"
  if (typeof env.cores === "number" && env.cores > 0 && env.cores <= 2) return "image"
  if (typeof env.memoryGb === "number" && env.memoryGb > 0 && env.memoryGb <= 2) return "image"
  return "3d"
}

/** Pointer or device tilt mapped to a gentle, clamped rotation in degrees. */
export function tiltFromPointer(x: number, y: number, width: number, height: number, maxDeg = 12): { rx: number; ry: number } {
  if (width <= 0 || height <= 0) return { rx: 0, ry: 0 }
  const nx = clamp((x / width) * 2 - 1, -1, 1)
  const ny = clamp((y / height) * 2 - 1, -1, 1)
  return { rx: round(-ny * maxDeg), ry: round(nx * maxDeg) }
}

/** DeviceOrientation beta/gamma (degrees) mapped to the same clamped rotation. */
export function tiltFromOrientation(beta: number | null, gamma: number | null, maxDeg = 12): { rx: number; ry: number } {
  if (beta === null || gamma === null || !Number.isFinite(beta) || !Number.isFinite(gamma)) return { rx: 0, ry: 0 }
  // A phone held upright in the hand sits around beta 45deg; treat that as level.
  return { rx: round(clamp((beta - 45) / 30, -1, 1) * -maxDeg), ry: round(clamp(gamma / 30, -1, 1) * maxDeg) }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function round(n: number) {
  return Math.round(n * 100) / 100 + 0
}
