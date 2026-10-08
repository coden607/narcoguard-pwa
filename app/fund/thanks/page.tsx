import type { Metadata } from "next"
import Link from "next/link"
import { donationMode, isCheckoutSessionId, receiptFromSession, type DonationReceipt } from "@/lib/donations"

export const metadata: Metadata = { title: "Thank you | NarcoGuard", robots: { index: false } }
export const dynamic = "force-dynamic"

// Confirms the donation with Stripe before thanking anyone. Only the amount, paid status and mode
// are read; the donor's name, email and card stay with Stripe.
async function lookup(sessionId: unknown): Promise<DonationReceipt | null> {
  if (!donationMode(process.env) || !isCheckoutSessionId(sessionId)) return null
  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    })
    return response.ok ? receiptFromSession(await response.json()) : null
  } catch {
    return null
  }
}

export default async function DonationThanksPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const receipt = await lookup((await searchParams).session_id)
  return (
    <main className="max-w-2xl mx-auto p-6 sm:p-10 space-y-4 text-center" data-testid="donation-thanks">
      {receipt?.paid ? (
        <>
          <h1 className="text-3xl font-bold">Thank you for your donation</h1>
          <p className="text-lg">{receipt.amountDollars !== undefined ? `$${receipt.amountDollars.toLocaleString()} received.` : "Your donation was received."}</p>
          {receipt.test && <p className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-sm">Test mode: no real money was charged.</p>}
          <p className="text-muted-foreground">Stripe emails your receipt. Your gift supports documented engineering and validation work on the NarcoGuard NG concept.</p>
        </>
      ) : receipt ? (
        <>
          <h1 className="text-3xl font-bold">Your donation is not complete yet</h1>
          <p className="text-muted-foreground">Stripe has not confirmed the payment. If you were charged, your receipt email is the record; otherwise you can try again.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold">Thank you for supporting NarcoGuard</h1>
          <p className="text-muted-foreground">We could not look up a donation from this link. If you donated, Stripe emails your receipt.</p>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        Need a refund within 30 days or have a question? Email <a className="underline" href="mailto:narcoguard607@gmail.com">narcoguard607@gmail.com</a>.
      </p>
      <Link className="underline text-primary" href="/fund">Back to the support page</Link>
    </main>
  )
}
