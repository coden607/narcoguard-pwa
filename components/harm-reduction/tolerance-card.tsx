import Link from "next/link"
import { SourceList } from "@/components/common/source-list"
import { TOLERANCE_INTRO, TOLERANCE_REVIEWED, TOLERANCE_SOURCES, TOLERANCE_TIPS } from "@/lib/tolerance-card"

/** Shown on Stay safer. Static content: nothing is asked, saved or sent. */
export function ToleranceCard() {
  return (
    <section aria-labelledby="tolerance" className="space-y-3 rounded-xl border-2 border-amber-400/70 p-5" data-testid="tolerance-card">
      <h2 id="tolerance" className="text-2xl font-semibold">Coming back after a break?</h2>
      <p>{TOLERANCE_INTRO}</p>
      <ul className="list-disc space-y-2 pl-5 text-sm">
        {TOLERANCE_TIPS.map((tip) => <li key={tip}>{tip}</li>)}
      </ul>
      <p className="text-sm">Treatment options are on <Link className="text-primary underline" href="/treatment">Start treatment</Link>.</p>
      <SourceList sources={TOLERANCE_SOURCES} reviewed={TOLERANCE_REVIEWED} testId="tolerance-sources" />
    </section>
  )
}
