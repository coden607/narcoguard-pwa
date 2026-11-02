import type { Metadata } from "next"
import Link from "next/link"
import { SourceList } from "@/components/common/source-list"
import { CallLineCard, DirectoryGroups } from "@/components/resources/directory-groups"
import { CARE_DIRECTORIES_REVIEWED, TREATMENT_DIRECTORIES, TREATMENT_FACTS, TREATMENT_LINE } from "@/lib/care-directories"

export const metadata: Metadata = {
  title: "Buprenorphine and methadone treatment | NarcoGuard",
  description: "Find buprenorphine or methadone treatment, including programs that start by video visit, from SAMHSA's public directories.",
}

export default function TreatmentPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Start treatment: buprenorphine or methadone</h1>
        <p className="text-muted-foreground">These links open public directories. NarcoGuard doesn&apos;t see what you search and doesn&apos;t pick a program for you. Call the program first: openings and hours change.</p>
      </header>
      <CallLineCard line={TREATMENT_LINE} testId="treatment-line" />
      <section aria-labelledby="facts" className="space-y-2">
        <h2 id="facts" className="text-2xl font-semibold">Good to know</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm" data-testid="treatment-facts">
          {TREATMENT_FACTS.map((fact) => <li key={fact}>{fact}</li>)}
        </ul>
      </section>
      <DirectoryGroups groups={TREATMENT_DIRECTORIES} />
      <p className="text-sm">Treatment programs near a ZIP code are also on <Link className="text-primary underline" href="/help">Find help</Link>.</p>
      <SourceList sources={TREATMENT_DIRECTORIES[1].links} reviewed={CARE_DIRECTORIES_REVIEWED} testId="treatment-sources" />
    </main>
  )
}
