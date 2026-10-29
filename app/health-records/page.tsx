import type { Metadata } from "next"
import Link from "next/link"
import { ExternalLink, HeartPulse, LockKeyhole } from "lucide-react"
import { getUhsSmartConfig, UHS_MYCHART_URL } from "@/lib/health/uhs-mychart"
import { hasUsableUhsSecret } from "@/lib/health/uhs-oauth"
import { UhsMyChartControls } from "@/components/health/uhs-mychart-controls"

export const metadata: Metadata = {
  title: "Health records | NarcoGuard",
  description: "Optional, user-controlled connections to health records. NarcoGuard never asks for your MyChart password.",
  robots: { index: false },
}

export default async function HealthRecordsPage({ searchParams }: { searchParams: Promise<{ error?: string | string[]; connected?: string | string[] }> }) {
  const uhs = getUhsSmartConfig()
  // The live flow is offered only when registration AND a usable session secret are both present.
  const ready = uhs.configured && hasUsableUhsSecret(process.env.UHS_SMART_SESSION_SECRET)
  const params = await searchParams
  const callbackError = typeof params.error === "string" ? params.error.slice(0, 40) : undefined

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
            NarcoGuard will never ask for or store your UHS MyChart username or password. The record connection uses UHS/Epic authorization and read-only FHIR permissions that you approve, and you can disconnect at any time.
          </p>
        </div>

        {ready ? (
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm" role="status">
            UHS MyChart connection is available. Records are read only when you tap Load, are tied to your NarcoGuard account, and are not saved.
          </div>
        ) : (
          <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm" role="status">
            Secure record sync is not enabled yet because NarcoGuard does not have the required UHS/Epic SMART app-registration values. You can still open UHS MyChart directly.
          </div>
        )}

        <UhsMyChartControls ready={ready} callbackError={callbackError} connected={params.connected === "1"} />

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
          <p className="font-medium text-foreground">Read-only data classes</p>
          <p>Demographics, vital signs, conditions, encounters, appointments and care goals. No chart writes, messages, refill requests or appointment changes.</p>
        </div>
      </section>
    </main>
  )
}
