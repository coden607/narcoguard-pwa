import { strict as assert } from "node:assert"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import vm from "node:vm"
import { applyTheme, DEFAULT_THEME, resolveTheme, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "../lib/theme"
import { chooseShowcaseMode, framesTooSlow, isSoftwareRenderer, tiltFromOrientation, tiltFromPointer } from "../lib/showcase-mode"
import { EMERGENCY_PRIMARY_PATHS } from "../lib/emergency-routes"

const read = (path: string) => readFileSync(path, "utf8")

function fakeDocument(initialDark = true) {
  const classes = new Set(initialDark ? ["dark"] : [])
  const style: Record<string, string> = {}
  return {
    classes,
    style,
    documentElement: {
      classList: {
        contains: (c: string) => classes.has(c),
        toggle: (c: string, force?: boolean) => { const on = force ?? !classes.has(c); if (on) classes.add(c); else classes.delete(c); return on },
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
      },
      style,
    },
    querySelector: () => null,
  }
}

function runInitScript(stored: string | null | "throws", initialDark = true) {
  const document = fakeDocument(initialDark)
  const localStorage = {
    getItem: (key: string) => {
      if (stored === "throws") throw new Error("SecurityError")
      return key === THEME_STORAGE_KEY ? stored : null
    },
  }
  // A system preference for light must not override the dark default.
  const matchMedia = () => ({ matches: false })
  vm.runInNewContext(THEME_INIT_SCRIPT, { document, localStorage, matchMedia })
  return document
}

test("dark is the default theme and only an explicit choice changes it", () => {
  assert.equal(DEFAULT_THEME, "dark")
  assert.equal(resolveTheme(null), "dark")
  assert.equal(resolveTheme(undefined), "dark")
  assert.equal(resolveTheme("system"), "dark")
  assert.equal(resolveTheme("light"), "light")
  assert.equal(resolveTheme("dark"), "dark")
})

test("pre-paint script applies the saved choice before hydration and falls back to dark", () => {
  assert.equal(runInitScript(null).classes.has("dark"), true)
  assert.equal(runInitScript("light").classes.has("dark"), false)
  assert.equal(runInitScript("light").style.colorScheme, "light")
  assert.equal(runInitScript("dark", false).classes.has("dark"), true)
  assert.equal(runInitScript("bogus").classes.has("dark"), true)
  assert.equal(runInitScript("throws").classes.has("dark"), true, "blocked storage still renders dark")
  assert.doesNotMatch(THEME_INIT_SCRIPT, /prefers-color-scheme/, "the user's choice, not the OS, decides")
})

test("applyTheme toggles the class and persists the choice", () => {
  const doc = fakeDocument(true)
  const saved: Record<string, string> = {}
  const ok = applyTheme("light", doc as unknown as Document, { setItem: (k, v) => { saved[k] = v } })
  assert.equal(ok, true)
  assert.equal(doc.classes.has("dark"), false)
  assert.equal(saved[THEME_STORAGE_KEY], "light")
  applyTheme("dark", doc as unknown as Document, { setItem: (k, v) => { saved[k] = v } })
  assert.equal(doc.classes.has("dark"), true)
  assert.equal(saved[THEME_STORAGE_KEY], "dark")
  const blocked = applyTheme("light", doc as unknown as Document, { setItem: () => { throw new Error("QuotaExceeded") } })
  assert.equal(blocked, false)
  assert.equal(doc.classes.has("dark"), false, "theme still applies for this visit when storage fails")
})

test("layout server-renders dark and runs the theme script inline in <head>", () => {
  const layout = read("app/layout.tsx")
  assert.match(layout, /className=\{`dark /)
  assert.match(layout, /suppressHydrationWarning/)
  assert.match(layout, /dangerouslySetInnerHTML=\{\{ __html: THEME_INIT_SCRIPT \}\}/)
  const chrome = read("components/site-chrome.tsx")
  assert.match(chrome, /data-testid="theme-toggle"/)
  assert.match(read("app/globals.css"), /\.menu-button\.theme-toggle \{ display: grid; \}/, "toggle stays visible on desktop")
})

test("3D showcase falls back to the static render without WebGL, with reduced motion, or on low-power devices", () => {
  const ok = { webgl: true, reducedMotion: false }
  assert.equal(chooseShowcaseMode(ok), "3d")
  assert.equal(chooseShowcaseMode({ ...ok, webgl: false }), "image")
  assert.equal(chooseShowcaseMode({ ...ok, reducedMotion: true }), "image")
  assert.equal(chooseShowcaseMode({ ...ok, saveData: true }), "image")
  assert.equal(chooseShowcaseMode({ ...ok, lowBattery: true }), "image")
  assert.equal(chooseShowcaseMode({ ...ok, cores: 2 }), "image")
  assert.equal(chooseShowcaseMode({ ...ok, memoryGb: 2 }), "image")
  assert.equal(chooseShowcaseMode({ ...ok, cores: 8, memoryGb: 8 }), "3d")
  assert.equal(chooseShowcaseMode({ ...ok, renderer: "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)" }), "image")
  assert.equal(chooseShowcaseMode({ ...ok, renderer: "llvmpipe (LLVM 15.0.7, 256 bits)" }), "image")
  assert.equal(chooseShowcaseMode({ ...ok, renderer: "Apple GPU" }), "3d")
  assert.equal(isSoftwareRenderer(undefined), false)
})

test("frame-time watchdog drops to the static render when the scene stutters", () => {
  assert.equal(framesTooSlow(Array(10).fill(200)), false, "needs enough samples before judging")
  assert.equal(framesTooSlow(Array(20).fill(16.7)), false)
  assert.equal(framesTooSlow([500, ...Array(19).fill(16.7)]), false, "one slow first frame (shader compile) is fine")
  assert.equal(framesTooSlow(Array(20).fill(120)), true)
})

test("tilt is clamped and centred", () => {
  assert.deepEqual(tiltFromPointer(50, 50, 100, 100), { rx: 0, ry: 0 })
  assert.deepEqual(tiltFromPointer(100, 0, 100, 100), { rx: 12, ry: 12 })
  assert.deepEqual(tiltFromPointer(500, 500, 100, 100), { rx: -12, ry: 12 })
  assert.deepEqual(tiltFromPointer(1, 1, 0, 0), { rx: 0, ry: 0 })
  assert.deepEqual(tiltFromOrientation(null, 10), { rx: 0, ry: 0 })
  assert.deepEqual(tiltFromOrientation(45, 0), { rx: 0, ry: 0 })
  assert.deepEqual(tiltFromOrientation(200, -200), { rx: -12, ry: -12 })
})

test("showcase lazy-loads three.js, is labelled as a concept, and stays off emergency screens", () => {
  const showcase = read("components/effects/holo-watch-showcase.tsx")
  assert.match(showcase, /import\("\.\/holo-watch-scene"\)/)
  assert.doesNotMatch(showcase, /from "three"/)
  assert.match(showcase, /Concept render/)
  assert.match(showcase, /not a medical device/)
  const scene = read("components/effects/holo-watch-scene.ts")
  assert.doesNotMatch(scene, /watch-geometry|watch-bom|partNumber|mAh/, "no engineering data in the marketing hologram")
  for (const page of ["app/page.tsx", "app/watch/page.tsx", "app/fund/page.tsx"]) assert.match(read(page), /<HoloWatchShowcase/)
  for (const path of EMERGENCY_PRIMARY_PATHS) {
    assert.doesNotMatch(read(`app${path}/page.tsx`), /HoloWatchShowcase|holo-watch/, `${path} stays free of 3D effects`)
  }
})
