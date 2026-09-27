import Link from "next/link"
import { readFileSync } from "node:fs"
import { join } from "node:path"

export const metadata = { title: "Founding Constitution — NarcoGuard" }

export default function ConstitutionPage() {
  const text = readFileSync(join(process.cwd(), "docs/governance/CONSTITUTION.md"), "utf8")
  return <main className="max-w-4xl mx-auto p-5 sm:p-10 space-y-6">
    <Link href="/" className="underline text-primary">← NarcoGuard dashboard</Link>
    <div className="border rounded-xl p-6 space-y-3">
      <h1 className="text-3xl font-bold">NarcoGuard Founding Constitution</h1>
      <p className="font-semibold">FOUNDING DRAFT — NOT YET RATIFIED</p>
      <p>Version 0.1 draft · Published September 27, 2026 · Source: approved September 18 community governance design.</p>
      <p>This draft invites criticism and revision. It does not grant binding governance authority or change emergency behavior.</p>
      <a className="underline text-primary" href="https://github.com/coden607/narcoguard-pwa/issues/new" target="_blank" rel="noopener noreferrer">Suggest a change, submit evidence, object or identify harm ↗</a>
      <p className="text-sm">A GitHub account is required for that form. You can also email <a className="underline" href="mailto:narcoguard607@gmail.com?subject=NarcoGuard%20Constitution%20feedback">narcoguard607@gmail.com</a>. Submissions do not change the Constitution automatically.</p>
    </div>
    <article className="whitespace-pre-wrap break-words leading-relaxed border rounded-xl p-6">{text}</article>
  </main>
}
