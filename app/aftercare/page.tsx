import type { Metadata } from "next"
import { SourceList } from "@/components/common/source-list"
import { Aftercare } from "@/components/harm-reduction/aftercare"
import { AFTERCARE_REVIEWED, AFTERCARE_SOURCES } from "@/lib/aftercare"

export const metadata: Metadata = {
  title: "After naloxone: what to do next | NarcoGuard",
  description: "Naloxone can wear off in 30 to 90 minutes. Keep 911 coming, stay with them, use the recovery position, and restock your kit.",
}

export default function AftercarePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">After naloxone: what to do next</h1>
        <p className="text-muted-foreground">You did the right thing. These steps work offline once this page has been opened, and nothing here is saved or sent.</p>
      </header>
      <Aftercare />
      <SourceList sources={AFTERCARE_SOURCES} reviewed={AFTERCARE_REVIEWED} testId="aftercare-sources" />
    </main>
  )
}
