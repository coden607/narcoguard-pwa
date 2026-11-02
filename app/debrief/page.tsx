import type { Metadata } from "next"
import Link from "next/link"
import { SourceList } from "@/components/common/source-list"
import { ResponderDebrief } from "@/components/harm-reduction/responder-debrief"
import { DEBRIEF_REVIEWED, DEBRIEF_SOURCES } from "@/lib/responder-debrief"

export const metadata: Metadata = {
  title: "After you helped someone | NarcoGuard",
  description: "A short, skippable check-in for people who responded to an overdose, with free support lines. Nothing is saved.",
}

export default function DebriefPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">After you helped someone</h1>
        <p className="text-muted-foreground">Responding to an overdose is a lot. This page is optional, stays on this phone and saves nothing.</p>
        <Link href="/" className="inline-flex min-h-11 items-center text-primary underline" data-testid="debrief-skip">Skip this</Link>
      </header>
      <ResponderDebrief />
      <SourceList sources={DEBRIEF_SOURCES} reviewed={DEBRIEF_REVIEWED} testId="debrief-sources" />
    </main>
  )
}
