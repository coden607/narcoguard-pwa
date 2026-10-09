// Factory harness only. Loaded with `node --import` into the production server so the real
// NarcoGuard code runs end to end while the outside world (OpenStreetMap, FindTreatment, the
// Kimi API) answers from fixtures. Active only when FACTORY_STUB=1; every other URL passes through.
import { readFileSync } from "node:fs"

if (process.env.FACTORY_STUB === "1") {
  const fixtures = JSON.parse(readFileSync(new URL("./fixtures/directories.json", import.meta.url), "utf8"))
  // Hidden scenarios bring their own areas. The builder never reads this file (FACTORY_RULES.md 9).
  const extra = process.env.FACTORY_EXTRA_FIXTURES
  const areas = extra ? JSON.parse(readFileSync(extra, "utf8")) : { nominatim: {}, overpass: [] }
  Object.assign(fixtures.nominatim, areas.nominatim)
  const overpassFor = (query) => areas.overpass.find((area) => query.includes(area.match))?.body ?? fixtures.overpass
  const realFetch = globalThis.fetch
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

  const angelReply = (body) => {
    const messages = body.messages ?? []
    const tool = [...messages].reverse().find((m) => m.role === "tool")
    if (tool) {
      let place
      try {
        const result = JSON.parse(tool.content)
        place = (result.groups ?? result.needs ?? []).flatMap((g) => g.places ?? g.results ?? [])[0]
      } catch { /* fall through to a plain reply */ }
      const text = place ? `The nearest place is ${place.name}${place.phone ? `, phone ${place.phone}` : ""}. Call first to check hours.` : "I couldn't find a place nearby. You can call 211."
      return { choices: [{ message: { role: "assistant", content: text } }] }
    }
    const last = messages.filter((m) => m.role === "user").at(-1)?.content ?? ""
    if (body.tools && /hungry|food|eat|water|shelter|sleep/i.test(last)) {
      const zip = /\b(\d{5})\b/.exec(last)?.[1]
      const args = { kinds: /hungry|food|eat/i.test(last) ? ["food"] : ["water"], ...(zip ? { zip } : {}) }
      return { choices: [{ message: { role: "assistant", content: null, tool_calls: [{ id: "call_1", type: "function", function: { name: "find_resources", arguments: JSON.stringify(args) } }] } }] }
    }
    return { choices: [{ message: { role: "assistant", content: "I'm here with you. What do you need right now?" } }] }
  }

  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url)
    if (url.pathname.endsWith("/api/interpreter")) {
      const query = String(init?.body ?? url.searchParams.get("data") ?? "")
      return json(overpassFor(decodeURIComponent(query)))
    }
    if (url.hostname === "nominatim.openstreetmap.org") return json(fixtures.nominatim[url.searchParams.get("postalcode")] ?? [])
    if (url.hostname === "findtreatment.gov") return json(fixtures.findtreatment)
    if (url.hostname === "api.moonshot.ai") return json(angelReply(JSON.parse(String(init?.body ?? "{}"))))
    return realFetch(input, init)
  }
  console.log("FACTORY_STUB active: directories and Angel provider answer from harness/fixtures")
}
