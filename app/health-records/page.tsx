import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLink, HeartPulse, LockKeyhole } from "lucide-react"
import { getUhsSmartConfig, UHS_MYCHART_URL } from "@/lib/health/uhs-mychart"

export const metadata: Metadata = {
  title: "Health records | NarcoGuard",
  description: "Optional, user-controlled connections to health records. NarcoGuard never asks for your MyChart password.",
  robots: { index: false },
}

export default function HealthRecordsPage() {
  const uhs = getUhsSmartConfig()

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Health records</h1>
        <p className="text-muted-foreground">
          Optional and read-only first. Health-record access is separate from emergency guidance, resource search and Angel chat.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border border-primary/25 bg-card/50 p-5" data-testid="uhs-mychart-connector">
        <div className="flex items-start gap-3">
          <HeartPulse className="mt-1 h-6 w-6 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-xl font-semibold">UHS MyChart</h2>
            <p className="text-sm text-muted-foreground">United Health Services uses Epic MyChart for patient records.</p>
          </div>
        </div>

        <div className="rounded-xl border p-4 text-sm">
          <p className="flex items-center gap-2 font-semibold"><LockKeyhole className="h-4 w-4" aria-hidden="true" />Privacy boundary</p>
          <p className="mt-2 text-muted-foreground">
            NarcoGuard will never ask for or store your UHS MyChart username or password. A future record connection uses UHS/Epic authorization and read-only FHIR permissions that you approve.
          </p>
        </div>

        {uhs.configured ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm" role="status">
            UHS SMART-on-FHIR app registration is configured. The authorization flow can be enabled after callback/token handling passes its privacy and revocation tests.
          </div>
        ) : (
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm" role="status">
            Secure record sync is not enabled yet because NarcoGuard does not have the required UHS/Epic SMART app-registration values. You can still open UHS MyChart directly.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground"
            href={UHS_MYCHART_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open UHS MyChart <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
          <Link className="inline-flex min-h-11 items-center rounded-lg border px-4 py-2 font-semibold" href="/privacy">
            Review NarcoGuard privacy
          </Link>
        </div>

        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Planned read-only data classes</p>
          <p>Demographics, vital signs, conditions, encounters, appointments and care goals. No chart writes, messages, refill requests or appointment changes.</p>
        </div>
      </section>
    </main>
  )
}
