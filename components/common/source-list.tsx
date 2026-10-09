/** A short, visible list of the sources behind safety guidance. Entries without a URL are named only. */
export function SourceList({ sources, reviewed, testId = "sources" }: { sources: { title: string; url?: string }[]; reviewed?: string; testId?: string }) {
  return (
    <section aria-label="Sources" className="space-y-1 text-xs text-muted-foreground" data-testid={testId}>
      <p className="font-semibold">Sources{reviewed ? ` (reviewed ${reviewed})` : ""}</p>
      <ul className="list-disc space-y-1 pl-5">
        {sources.map((source) => (
          <li key={source.title}>
            {source.url ? <a className="inline-flex min-h-6 items-center underline hover:text-primary" href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a> : source.title}
          </li>
        ))}
      </ul>
      <p>General information, not medical advice. In an emergency, call 911.</p>
    </section>
  )
}
