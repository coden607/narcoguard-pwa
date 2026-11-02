import type { Metadata } from "next"
import Link from "next/link"
import { SourceList } from "@/components/common/source-list"
import { CALL_SCRIPT, CALL_SCRIPT_REVIEWED, CALL_SCRIPT_SOURCES, CALL_SCRIPT_TEXT_NOTE } from "@/lib/call-script"

export const metadata: Metadata = {
  title: "What to say when you call 911 | NarcoGuard",
  description: "A short script for a 911 call about an overdose: the person is not breathing, where you are, what you gave, and stay on the line.",
}

// The 911 call script card (#297). Static and offline-friendly; nothing is saved or sent.
export default function CallScriptPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8">
      <h1 className="text-4xl font-black">What to say when you call 911</h1>
      <a href="tel:911" className="block min-h-14 rounded-2xl bg-red-600 px-6 py-5 text-center text-3xl font-black text-white" data-testid="script-911">Call 911</a>
      <ol className="space-y-4" data-testid="call-script">
        {CALL_SCRIPT.map((line, index) => (
          <li key={line.say} className="rounded-2xl border-2 border-primary/60 p-4">
            <p className="text-2xl font-bold">{index + 1}. &ldquo;{line.say}&rdquo;</p>
            <p className="mt-1 text-lg">{line.tip}</p>
          </li>
        ))}
      </ol>
      <p className="rounded-xl bg-amber-100 p-4 text-lg text-black">{CALL_SCRIPT_TEXT_NOTE}</p>
      <Link href="/bystander" className="block rounded-2xl border-2 border-primary px-6 py-4 text-center text-xl font-bold">Overdose steps</Link>
      <SourceList sources={CALL_SCRIPT_SOURCES} reviewed={CALL_SCRIPT_REVIEWED} testId="call-script-sources" />
    </main>
  )
}
