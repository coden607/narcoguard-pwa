import type { CallLine, CareDirectoryGroup } from "@/lib/care-directories"

/** One call line, shown as a large tel: button. */
export function CallLineCard({ line, testId }: { line: CallLine; testId?: string }) {
  return (
    <div className="space-y-2 rounded-xl border-2 border-primary/60 p-4" data-testid={testId}>
      <a href={`tel:${line.tel}`} className="inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-lg font-bold text-primary-foreground">
        Call {line.name}: {line.display}
      </a>
      <p className="text-sm text-muted-foreground">{line.what}</p>
    </div>
  )
}

/** Directory links grouped under headings. Each opens the public directory in a new tab. */
export function DirectoryGroups({ groups }: { groups: CareDirectoryGroup[] }) {
  return (
    <>
      {groups.map((group) => (
        <section key={group.id} aria-labelledby={`dir-${group.id}`} className="space-y-3" data-testid={`directory-${group.id}`}>
          <h2 id={`dir-${group.id}`} className="text-2xl font-semibold">{group.title}</h2>
          <p className="text-sm text-muted-foreground">{group.intro}</p>
          <ul className="space-y-3">
            {group.links.map((link) => (
              <li key={link.url} className="rounded-lg border p-3">
                <a className="inline-flex min-h-6 items-center font-semibold text-primary underline" href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
                <p className="text-sm text-muted-foreground">{link.what}</p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
