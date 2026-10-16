import type { Metadata } from "next"
import Link from "next/link"
import {
  BENEFIT_LINKS, CRISIS_LINES, MEETING_FINDERS, NALOXONE_SOURCES, NEVER_USE_ALONE, SAFER_USE_REVIEWED,
  TEST_STRIP_FACTS, TEST_STRIP_SOURCES, type HelpLink,
} from "@/lib/safer-use"

export const metadata: Metadata = {
  title: "Stay safer | NarcoGuard",
  description: "Never Use Alone, where to get naloxone free or without a prescription, how fentanyl and xylazine test strips work, recovery meetings and benefits, with sources.",
}

function LinkList({ links, testId }: { links: HelpLink[]; testId: string }) {
  return (
    <ul className="space-y-3" data-testid={testId}>
      {links.map((link) => (
        <li key={link.url} className="rounded-lg border p-3">
          <a className="inline-flex min-h-6 items-center font-semibold text-primary underline" href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>
          <p className="text-sm text-muted-foreground">{link.what}</p>
        </li>
      ))}
    </ul>
  )
}

export default function SaferUsePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Stay safer</h1>
        <p className="text-muted-foreground">
          No judgment and nothing to sign up for. This page works offline once you have opened it, and nothing you do here is saved or sent.
        </p>
      </header>

      <section aria-labelledby="nua" className="space-y-3 rounded-xl border-2 border-primary/60 p-5" data-testid="never-use-alone">
        <h2 id="nua" className="text-2xl font-semibold">Using alone? Call first</h2>
        <p>{NEVER_USE_ALONE.what}</p>
        <a href={`tel:${NEVER_USE_ALONE.tel}`} className="inline-flex min-h-12 items-center rounded-lg bg-primary px-5 text-lg font-bold text-primary-foreground">
          Call Never Use Alone {NEVER_USE_ALONE.display}
        </a>
        <p className="text-xs text-muted-foreground">
          Run by <a className="underline" href={NEVER_USE_ALONE.source} target="_blank" rel="noopener noreferrer">neverusealone.com</a>, not NarcoGuard. NarcoGuard does not connect the call or share anything with them.
        </p>
      </section>

      <section aria-labelledby="lines" className="space-y-3">
        <h2 id="lines" className="text-2xl font-semibold">Call or text now</h2>
        <ul className="grid gap-3 sm:grid-cols-2" data-testid="crisis-lines">
          {CRISIS_LINES.map((line) => (
            <li key={line.tel} className="rounded-lg border p-3">
              <a href={`tel:${line.tel}`} className="inline-flex min-h-11 items-center font-semibold text-primary underline">{line.name}: {line.display}</a>
              <p className="text-sm text-muted-foreground">{line.what}</p>
            </li>
          ))}
        </ul>
        <p className="text-sm">Someone won&apos;t wake up? Follow the <Link className="text-primary underline" href="/ar">step-by-step overdose guide</Link>.</p>
      </section>

      <section aria-labelledby="naloxone" className="space-y-3">
        <h2 id="naloxone" className="text-2xl font-semibold">Get naloxone (Narcan)</h2>
        <p className="text-sm text-muted-foreground">Naloxone reverses opioid overdoses and does not harm someone who has no opioids in their body. Keep it where people can find it.</p>
        <LinkList links={NALOXONE_SOURCES} testId="naloxone-sources" />
        <p className="text-sm">Pharmacies near you are listed under <Link className="text-primary underline" href="/help">Find help</Link> (call first to check they have it).</p>
      </section>

      <section aria-labelledby="strips" className="space-y-3">
        <h2 id="strips" className="text-2xl font-semibold">Fentanyl and xylazine test strips</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm" data-testid="test-strip-facts">
          {TEST_STRIP_FACTS.map((fact) => <li key={fact}>{fact}</li>)}
        </ul>
        <LinkList links={TEST_STRIP_SOURCES} testId="test-strip-sources" />
      </section>

      <section aria-labelledby="meetings" className="space-y-3">
        <h2 id="meetings" className="text-2xl font-semibold">Recovery meetings</h2>
        <p className="text-sm text-muted-foreground">Free peer meetings, many online for when you can&apos;t get a ride. Go whenever you want.</p>
        <LinkList links={MEETING_FINDERS} testId="meeting-finders" />
      </section>

      <section aria-labelledby="benefits" className="space-y-3">
        <h2 id="benefits" className="text-2xl font-semibold">Benefits you may qualify for</h2>
        <p className="text-sm text-muted-foreground">Official application pages. NarcoGuard doesn&apos;t decide eligibility or see your answers.</p>
        <LinkList links={BENEFIT_LINKS} testId="benefit-links" />
      </section>

      <p className="text-xs text-muted-foreground">General information, not medical advice. Links reviewed {SAFER_USE_REVIEWED}.</p>
    </main>
  )
}
