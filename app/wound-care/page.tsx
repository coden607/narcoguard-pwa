import type { Metadata } from "next"
import { SourceList } from "@/components/common/source-list"
import { DirectoryGroups } from "@/components/resources/directory-groups"
import { WOUND_CARE_FINDERS, WOUND_CARE_REVIEWED, WOUND_CARE_SOURCES, WOUND_CARE_STEPS, WOUND_DANGER_SIGNS } from "@/lib/wound-care"

export const metadata: Metadata = {
  title: "Xylazine (tranq) wound care | NarcoGuard",
  description: "How to look after a xylazine wound, the signs that need care today, and where to find free or low-cost wound care.",
}

export default function WoundCarePage() {
  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Xylazine (tranq) wound care</h1>
        <p className="text-muted-foreground">No judgment. NarcoGuard never asks for photos of wounds, and nothing on this page is saved or sent.</p>
      </header>

      <section aria-labelledby="danger" className="space-y-2 rounded-xl border-2 border-red-500/60 p-5" data-testid="wound-danger-signs">
        <h2 id="danger" className="text-2xl font-semibold">Get care today if you notice</h2>
        <ul className="list-disc space-y-1 pl-5">
          {WOUND_DANGER_SIGNS.map((sign) => <li key={sign}>{sign}</li>)}
        </ul>
        <p className="text-sm">Very sick, confused or struggling to breathe? <a className="font-semibold text-primary underline" href="tel:911">Call 911</a>.</p>
      </section>

      <section aria-labelledby="care" className="space-y-2" data-testid="wound-care-steps">
        <h2 id="care" className="text-2xl font-semibold">Looking after a wound</h2>
        <ul className="list-disc space-y-2 pl-5">
          {WOUND_CARE_STEPS.map((step) => <li key={step}>{step}</li>)}
        </ul>
      </section>

      <DirectoryGroups groups={WOUND_CARE_FINDERS} />
      <SourceList sources={WOUND_CARE_SOURCES} reviewed={WOUND_CARE_REVIEWED} testId="wound-care-sources" />
    </main>
  )
}
