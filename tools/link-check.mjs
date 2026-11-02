#!/usr/bin/env node
// Resource link checker (#299). Finds the external https links in the app's source and reports
// the ones that are gone, so a hotline or directory link never quietly breaks.
// Dependency-free: Node 24's fetch. Run: node tools/link-check.mjs [--json]
// Exit 0 when nothing is dead, 1 when something is, 2 on a checker error. Unreachable links are
// listed for a person to check but do not fail the run.
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"
import { pathToFileURL } from "node:url"

export const SCAN_DIRS = ["app", "components", "lib", "public/offline.html"]
const EXTENSIONS = /\.(ts|tsx|html)$/
// Our own site, placeholders and endpoints that need parameters are not resource links.
const SKIP_HOSTS = /(^|\.)(narcoguard\.app|example\.(com|org|net)|localhost|[a-z-]+\.invalid|invalid|vercel\.app|vercel\.sh|supabase\.co|openrouter\.ai|api\.[a-z.]+)$/
const SKIP_PATHS = /\/(api|v\d+)\//

/** External https links in a block of source text, deduplicated, in order. */
export function extractLinks(source) {
  const found = new Set()
  for (const match of source.matchAll(/https:\/\/[^\s"'`<>)\]}\\]+/g)) {
    const link = match[0].replace(/[.,;:!?]+$/, "")
    if (link.includes("${")) continue
    let host
    try {
      host = new URL(link).hostname
    } catch {
      continue
    }
    if (!SKIP_HOSTS.test(host) && !SKIP_PATHS.test(new URL(link).pathname + "/")) found.add(link)
  }
  return [...found]
}

/** Dead means gone (404/410) or a server failing on every try. Bot blocks are not dead. */
export function isDead(status) {
  return status === 404 || status === 410 || status >= 500
}

function walk(path, out = []) {
  const stats = statSync(path, { throwIfNoEntry: false })
  if (!stats) return out
  if (stats.isFile()) {
    if (EXTENSIONS.test(path)) out.push(path)
    return out
  }
  for (const name of readdirSync(path)) if (name !== "node_modules") walk(join(path, name), out)
  return out
}

async function status(url) {
  for (const method of ["HEAD", "GET", "GET"]) {
    try {
      const response = await fetch(url, { method, redirect: "follow", signal: AbortSignal.timeout(15_000), headers: { "user-agent": "Mozilla/5.0 (compatible; NarcoGuard-link-check/1.0; +https://www.narcoguard.app)" } })
      if (!isDead(response.status) && response.status !== 405) return response.status
      if (method === "GET" && response.status !== 405 && !isDead(response.status)) return response.status
      if (response.status === 404 || response.status === 410) return response.status
    } catch {
      // network error or timeout: retry, then report as 0
    }
  }
  return 0
}

export async function checkLinks(root = process.cwd()) {
  const sources = new Map()
  for (const dir of SCAN_DIRS) {
    for (const file of walk(join(root, dir))) {
      for (const link of extractLinks(readFileSync(file, "utf8"))) {
        if (!sources.has(link)) sources.set(link, [])
        sources.get(link).push(relative(root, file))
      }
    }
  }
  const links = [...sources.keys()]
  const results = []
  for (let i = 0; i < links.length; i += 8) {
    const batch = links.slice(i, i + 8)
    results.push(...(await Promise.all(batch.map(async (url) => ({ url, status: await status(url), files: sources.get(url) })))))
  }
  // No answer at all is listed separately: some government sites drop non-browser clients.
  return { checked: results.length, dead: results.filter((result) => isDead(result.status)), unreachable: results.filter((result) => result.status === 0) }
}

async function main() {
  try {
    const report = await checkLinks()
    if (process.argv.includes("--json")) console.log(JSON.stringify(report, null, 2))
    else {
      console.log(`Checked ${report.checked} links, ${report.dead.length} dead, ${report.unreachable.length} unreachable.`)
      for (const dead of report.dead) console.log(`DEAD ${dead.status} ${dead.url}  (${dead.files.join(", ")})`)
      for (const quiet of report.unreachable) console.log(`UNREACHABLE ${quiet.url}  (${quiet.files.join(", ")}) - check by hand`)
    }
    process.exitCode = report.dead.length ? 1 : 0
  } catch (error) {
    console.error(error)
    process.exitCode = 2
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
