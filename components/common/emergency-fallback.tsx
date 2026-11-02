import Link from "next/link"
import { OVERDOSE_STEPS } from "@/components/emergency/overdose-steps"

// Shown by the error and not-found screens (#296). Links and markup only, so it still
// works when the rest of the app has failed: no client state, no icons, no data fetching.
export const FALLBACK_COPY = {
  lead: "If someone is not breathing or won't wake up, call 911 now.",
  stepsTitle: "What to do now",
} as const

export function EmergencyFallback({ title, message, onRetry }: { title: string; message: string; onRetry?: () => void }) {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-4 sm:p-8" data-testid="emergency-fallback">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-lg">{message}</p>
      </header>
      <p className="text-xl font-semibold">{FALLBACK_COPY.lead}</p>
      <a href="tel:911" className="block min-h-14 rounded-2xl bg-red-600 px-6 py-4 text-center text-3xl font-black text-white" data-testid="fallback-911">
        Call 911
      </a>
      <section aria-labelledby="fallback-steps" className="space-y-3">
        <h2 id="fallback-steps" className="text-2xl font-bold">{FALLBACK_COPY.stepsTitle}</h2>
        <ol className="list-decimal space-y-3 pl-7 text-xl leading-snug">
          {OVERDOSE_STEPS.map((step) => <li key={step}>{step}</li>)}
        </ol>
      </section>
      <nav aria-label="Next steps" className="grid gap-3 sm:grid-cols-3">
        {onRetry ? (
          <button type="button" onClick={onRetry} className="min-h-12 rounded-xl border-2 border-primary px-4 py-3 text-lg font-bold">
            Try again
          </button>
        ) : null}
        <Link href="/bystander" className="min-h-12 rounded-xl border-2 border-primary px-4 py-3 text-center text-lg font-bold">Steps for a helper</Link>
        <Link href="/" className="min-h-12 rounded-xl border-2 border-primary px-4 py-3 text-center text-lg font-bold">Home</Link>
      </nav>
      <p className="text-xs text-muted-foreground">General information, not medical advice. Steps follow CDC and SAMHSA naloxone guidance.</p>
    </main>
  )
}
