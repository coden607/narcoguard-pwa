import type { Metadata } from "next"
import Link from "next/link"
import { SourceList } from "@/components/common/source-list"
import { PHARMACY_CARD_LINES, PHARMACY_CARD_REVIEWED, PHARMACY_CARD_SOURCES, PHARMACY_CARD_TIPS } from "@/lib/pharmacy-card"

export const metadata: Metadata = {
  title: "Ask a pharmacist for naloxone | NarcoGuard",
  description: "A card to show the pharmacist when you ask for naloxone (Narcan). Works offline once opened. Rules vary by state.",
}

export default function NaloxoneCardPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Ask for naloxone</h1>
        <p className="text-muted-foreground">Turn your phone around and show this card at the pharmacy counter. Nothing here is saved or sent.</p>
      </header>

      <section aria-labelledby="card-title" className="space-y-3 rounded-2xl border-2 border-primary bg-white p-6 text-slate-950" data-testid="pharmacy-card">
        <h2 id="card-title" className="text-2xl font-bold">For the pharmacist</h2>
        <ul className="space-y-3 text-xl leading-snug">
          {PHARMACY_CARD_LINES.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </section>

      <section aria-labelledby="tips" className="space-y-2">
        <h2 id="tips" className="text-xl font-semibold">Good to know</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm" data-testid="pharmacy-tips">
          {PHARMACY_CARD_TIPS.map((tip) => <li key={tip}>{tip}</li>)}
        </ul>
        <p className="text-sm">More free and low-cost options are on <Link className="text-primary underline" href="/safer-use">Stay safer</Link>. Pharmacies near you are on <Link className="text-primary underline" href="/help">Find help</Link>.</p>
      </section>

      <SourceList sources={PHARMACY_CARD_SOURCES} reviewed={PHARMACY_CARD_REVIEWED} testId="pharmacy-card-sources" />
    </main>
  )
}
