import type { Metadata } from "next"
import { SourceList } from "@/components/common/source-list"
import { DirectoryGroups } from "@/components/resources/directory-groups"
import { CARE_DIRECTORIES_REVIEWED, PREVENTION_DIRECTORIES, PREVENTION_FACTS } from "@/lib/care-directories"

export const metadata: Metadata = {
  title: "Syringe services, testing and PrEP | NarcoGuard",
  description: "Find syringe services programs, free HIV and hepatitis C testing, and PrEP through public directories.",
}

export default function PreventionPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Syringe services, testing and PrEP</h1>
        <p className="text-muted-foreground">These links open public directories. NarcoGuard doesn&apos;t see what you search. Call first: hours and services change.</p>
      </header>
      <ul className="list-disc space-y-2 pl-5 text-sm" data-testid="prevention-facts">
        {PREVENTION_FACTS.map((fact) => <li key={fact}>{fact}</li>)}
      </ul>
      <DirectoryGroups groups={PREVENTION_DIRECTORIES} />
      <SourceList sources={[...PREVENTION_DIRECTORIES[1].links.slice(0, 2), PREVENTION_DIRECTORIES[2].links[1]]} reviewed={CARE_DIRECTORIES_REVIEWED} testId="prevention-sources" />
    </main>
  )
}
