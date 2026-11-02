import type { Metadata } from "next"
import { Phone } from "lucide-react"
import { SourceList } from "@/components/common/source-list"
import { BreathingMetronome } from "@/components/harm-reduction/breathing-metronome"
import { RESCUE_BREATHING_REVIEWED, RESCUE_BREATHING_SETUP, RESCUE_BREATHING_SOURCES } from "@/lib/rescue-breathing"

export const metadata: Metadata = {
  title: "Rescue breathing timer | NarcoGuard",
  description: "A hands-free cue for rescue breaths during an overdose: one breath every 5 seconds. Call 911 first.",
}

export default function RescueBreathingPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Rescue breathing</h1>
        <p className="text-muted-foreground">For someone who is not breathing or barely breathing. Works offline once opened; nothing is saved or sent.</p>
      </header>
      <a href="tel:911" className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-red-600 text-xl font-bold text-white hover:bg-red-700">
        <Phone className="h-6 w-6" aria-hidden="true" />Call 911
      </a>
      <ol className="list-decimal space-y-2 pl-5" data-testid="rescue-breathing-steps">
        {RESCUE_BREATHING_SETUP.map((step) => <li key={step}>{step}</li>)}
      </ol>
      <BreathingMetronome />
      <SourceList sources={RESCUE_BREATHING_SOURCES} reviewed={RESCUE_BREATHING_REVIEWED} testId="rescue-breathing-sources" />
    </main>
  )
}
